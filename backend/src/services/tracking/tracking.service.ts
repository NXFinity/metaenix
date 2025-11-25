import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ViewTrack } from './assets/entities/view-track.entity';
import { ResourceType } from './assets/enum/resource-type.enum';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import * as geoip from 'geoip-lite';

@Injectable()
export class TrackingService {
  constructor(
    @InjectRepository(ViewTrack)
    private readonly viewTrackRepository: Repository<ViewTrack>,
    private readonly loggingService: LoggingService,
  ) {}

  /**
   * Get client IP address from request
   */
  private getClientIp(req: any): string | null {
    const forwarded = req.headers?.['x-forwarded-for'];
    const ip = forwarded
      ? forwarded.split(',')[0].trim()
      : req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;

    // Handle IPv6-mapped IPv4 addresses
    if (ip && ip.startsWith('::ffff:')) {
      return ip.substring(7);
    }

    return ip || null;
  }

  /**
   * Get user agent from request
   */
  private getUserAgent(req: any): string | null {
    return req.headers?.['user-agent'] || null;
  }

  /**
   * Get referrer from request
   */
  private getReferrer(req: any): string | null {
    return req.headers?.['referer'] || req.headers?.['referrer'] || null;
  }

  /**
   * Get country name from country code
   */
  private getCountryName(countryCode: string | null): string | null {
    if (!countryCode) return null;

    const countryNames: Record<string, string> = {
      US: 'United States',
      GB: 'United Kingdom',
      CA: 'Canada',
      AU: 'Australia',
      DE: 'Germany',
      FR: 'France',
      IT: 'Italy',
      ES: 'Spain',
      NL: 'Netherlands',
      BE: 'Belgium',
      CH: 'Switzerland',
      AT: 'Austria',
      SE: 'Sweden',
      NO: 'Norway',
      DK: 'Denmark',
      FI: 'Finland',
      PL: 'Poland',
      CZ: 'Czech Republic',
      IE: 'Ireland',
      PT: 'Portugal',
      GR: 'Greece',
      JP: 'Japan',
      CN: 'China',
      KR: 'South Korea',
      IN: 'India',
      BR: 'Brazil',
      MX: 'Mexico',
      AR: 'Argentina',
      CL: 'Chile',
      CO: 'Colombia',
      PE: 'Peru',
      ZA: 'South Africa',
      EG: 'Egypt',
      NG: 'Nigeria',
      KE: 'Kenya',
      TR: 'Turkey',
      SA: 'Saudi Arabia',
      AE: 'United Arab Emirates',
      IL: 'Israel',
      RU: 'Russia',
      UA: 'Ukraine',
      NZ: 'New Zealand',
      SG: 'Singapore',
      MY: 'Malaysia',
      TH: 'Thailand',
      ID: 'Indonesia',
      PH: 'Philippines',
      VN: 'Vietnam',
      TW: 'Taiwan',
      HK: 'Hong Kong',
    };

    return countryNames[countryCode] || countryCode;
  }

  /**
   * Get country information from IP address
   */
  private getCountryFromIp(ip: string | null): {
    countryCode: string | null;
    countryName: string | null;
    city: string | null;
    region: string | null;
  } {
    if (!ip) {
      return {
        countryCode: null,
        countryName: null,
        city: null,
        region: null,
      };
    }

    try {
      // Skip localhost/private IPs
      if (
        ip === '127.0.0.1' ||
        ip === '::1' ||
        ip.startsWith('192.168.') ||
        ip.startsWith('10.') ||
        ip.startsWith('172.16.') ||
        ip.startsWith('172.17.') ||
        ip.startsWith('172.18.') ||
        ip.startsWith('172.19.') ||
        ip.startsWith('172.20.') ||
        ip.startsWith('172.21.') ||
        ip.startsWith('172.22.') ||
        ip.startsWith('172.23.') ||
        ip.startsWith('172.24.') ||
        ip.startsWith('172.25.') ||
        ip.startsWith('172.26.') ||
        ip.startsWith('172.27.') ||
        ip.startsWith('172.28.') ||
        ip.startsWith('172.29.') ||
        ip.startsWith('172.30.') ||
        ip.startsWith('172.31.')
      ) {
        return {
          countryCode: null,
          countryName: null,
          city: null,
          region: null,
        };
      }

      const geo = geoip.lookup(ip);
      if (!geo) {
        return {
          countryCode: null,
          countryName: null,
          city: null,
          region: null,
        };
      }

      // Map country code to country name
      const countryName = this.getCountryName(geo.country);

      return {
        countryCode: geo.country || null,
        countryName: countryName,
        city: geo.city || null,
        region: geo.region || null,
      };
    } catch (error) {
      this.loggingService.error(
        'Error getting country from IP',
        error instanceof Error ? error.stack : undefined,
        'TrackingService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { ip },
        },
      );
      return {
        countryCode: null,
        countryName: null,
        city: null,
        region: null,
      };
    }
  }

  /**
   * Check if a view already exists within the deduplication window
   * Returns true if a duplicate view exists, false otherwise
   */
  private async hasRecentView(
    resourceType: ResourceType | string,
    resourceId: string,
    viewerUserId: string | null,
    ipAddress: string | null,
    deduplicationWindowMinutes: number = 60, // Default: 1 hour
  ): Promise<boolean> {
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - deduplicationWindowMinutes);

    // Build query based on whether we have an authenticated user or anonymous IP
    const queryBuilder = this.viewTrackRepository
      .createQueryBuilder('viewTrack')
      .where('viewTrack.resourceType = :resourceType', { resourceType })
      .andWhere('viewTrack.resourceId = :resourceId', { resourceId })
      .andWhere('viewTrack.dateCreated >= :windowStart', { windowStart });

    if (viewerUserId) {
      // For authenticated users: check by viewerUserId
      queryBuilder.andWhere('viewTrack.viewerUserId = :viewerUserId', { viewerUserId });
    } else if (ipAddress) {
      // For anonymous users: check by IP address
      queryBuilder.andWhere('viewTrack.ipAddress = :ipAddress', { ipAddress });
    } else {
      // No way to identify the viewer, allow the view
      return false;
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }

  /**
   * Track a view for any resource type with deduplication
   * Prevents duplicate views from the same user/IP within a time window
   */
  async trackView(
    resourceType: ResourceType | string,
    resourceId: string,
    userId: string,
    req: any,
    viewerUserId?: string,
    deduplicationWindowMinutes: number = 60, // Default: 1 hour window
  ): Promise<{ tracked: boolean; reason?: string }> {
    try {
      const ip = this.getClientIp(req);
      const geoData = this.getCountryFromIp(ip);
      const userAgent = this.getUserAgent(req);
      const referrer = this.getReferrer(req);

      // Check for recent duplicate view
      const hasRecent = await this.hasRecentView(
        resourceType,
        resourceId,
        viewerUserId || null,
        ip,
        deduplicationWindowMinutes,
      );

      if (hasRecent) {
        // Duplicate view detected within time window, skip tracking
        return {
          tracked: false,
          reason: `Duplicate view detected within ${deduplicationWindowMinutes} minute window`,
        };
      }

      // No recent view found, track this view
      const viewTrack = this.viewTrackRepository.create({
        resourceType,
        resourceId,
        userId,
        ipAddress: ip,
        countryCode: geoData.countryCode,
        countryName: geoData.countryName,
        city: geoData.city,
        region: geoData.region,
        viewerUserId: viewerUserId || null,
        userAgent,
        referrer,
      });

      await this.viewTrackRepository.save(viewTrack);
      return { tracked: true };
    } catch (error) {
      // Silently fail for view tracking
      this.loggingService.error(
        `Error tracking view for ${resourceType}:${resourceId}`,
        error instanceof Error ? error.stack : undefined,
        'TrackingService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { resourceType, resourceId, userId },
        },
      );
      return { tracked: false, reason: 'Error saving view track' };
    }
  }

  /**
   * Track profile view (convenience method)
   */
  async trackProfileView(
    userId: string,
    req: any,
    viewerUserId?: string,
  ): Promise<{ tracked: boolean; reason?: string }> {
    return this.trackView(ResourceType.PROFILE, userId, userId, req, viewerUserId);
  }

  /**
   * Track post view (convenience method)
   */
  async trackPostView(
    postId: string,
    userId: string,
    req: any,
    viewerUserId?: string,
  ): Promise<{ tracked: boolean; reason?: string }> {
    return this.trackView(ResourceType.POST, postId, userId, req, viewerUserId);
  }

  /**
   * Track video view (convenience method)
   */
  async trackVideoView(
    videoId: string,
    userId: string,
    req: any,
    viewerUserId?: string,
  ): Promise<{ tracked: boolean; reason?: string }> {
    return this.trackView(ResourceType.VIDEO, videoId, userId, req, viewerUserId);
  }

  /**
   * Track photo view (convenience method)
   */
  async trackPhotoView(
    photoId: string,
    userId: string,
    req: any,
    viewerUserId?: string,
  ): Promise<{ tracked: boolean; reason?: string }> {
    return this.trackView(ResourceType.PHOTO, photoId, userId, req, viewerUserId);
  }
}
