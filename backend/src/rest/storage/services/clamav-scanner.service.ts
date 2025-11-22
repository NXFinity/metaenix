import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggingService, LogCategory } from '@logging/logging';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as net from 'net';
import { writeFile, unlink, access } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

const execAsync = promisify(exec);

export interface ScanResult {
  isInfected: boolean;
  threats: string[];
  error?: string;
}

@Injectable()
export class ClamAVScannerService implements OnModuleInit {
  private readonly logger = new Logger(ClamAVScannerService.name);
  private readonly enabled: boolean;
  private readonly host: string;
  private readonly port: number;
  private readonly timeout: number;
  private readonly useSocket: boolean;
  private readonly socketPath: string;
  private isAvailable: boolean = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly loggingService: LoggingService,
  ) {
    this.enabled = this.configService.get<string>('CLAMAV_ENABLED', 'false') === 'true';
    this.host = this.configService.get<string>('CLAMAV_HOST', 'localhost');
    this.port = this.configService.get<number>('CLAMAV_PORT', 3310);
    this.timeout = this.configService.get<number>('CLAMAV_TIMEOUT', 30000); // 30 seconds
    this.useSocket = this.configService.get<string>('CLAMAV_USE_SOCKET', 'false') === 'true';
    this.socketPath = this.configService.get<string>('CLAMAV_SOCKET_PATH', '/var/run/clamav/clamd.ctl');
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.log('ClamAV scanning is disabled');
      return;
    }

    // Check if ClamAV is available
    await this.checkAvailability();
  }

  /**
   * Check if ClamAV is available and accessible
   */
  private async checkAvailability(): Promise<void> {
    try {
      if (this.useSocket) {
        // Check socket file exists
        try {
          await access(this.socketPath);
          this.isAvailable = true;
          this.logger.log(`ClamAV socket is available at ${this.socketPath}`);
        } catch {
          this.isAvailable = false;
          this.logger.warn(`ClamAV socket not found at ${this.socketPath}. Virus scanning will be skipped.`);
        }
      } else {
        // Try to connect to ClamAV daemon via TCP
        const isConnected = await this.testConnection();
        this.isAvailable = isConnected;
        if (isConnected) {
          this.logger.log(`ClamAV daemon is available at ${this.host}:${this.port}`);
        } else {
          this.logger.warn(`ClamAV daemon not reachable at ${this.host}:${this.port}. Virus scanning will be skipped.`);
        }
      }
    } catch (error) {
      this.isAvailable = false;
      this.logger.warn('Failed to check ClamAV availability', error);
    }
  }

  /**
   * Test TCP connection to ClamAV daemon
   */
  private testConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 5000);

      socket.once('connect', () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(true);
      });

      socket.once('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });

      socket.connect(this.port, this.host);
    });
  }

  /**
   * Scan a file buffer for viruses using ClamAV
   * @param buffer - File buffer to scan
   * @param filename - Original filename (for logging)
   * @returns Scan result with infection status
   */
  async scanBuffer(buffer: Buffer, filename?: string): Promise<ScanResult> {
    if (!this.enabled) {
      return { isInfected: false, threats: [] };
    }

    if (!this.isAvailable) {
      this.logger.warn('ClamAV is not available, skipping virus scan');
      return { isInfected: false, threats: [] };
    }

    try {
      // Write buffer to temporary file for scanning
      const tempFile = join(tmpdir(), `clamav-scan-${randomBytes(16).toString('hex')}`);
      
      try {
        // Write buffer to temp file
        await writeFile(tempFile, buffer);

        // Scan the file
        const result = await this.scanFile(tempFile);

        // Clean up temp file
        await unlink(tempFile).catch(() => {
          // Ignore cleanup errors
        });

        return result;
      } catch (error) {
        // Clean up temp file on error
        await unlink(tempFile).catch(() => {
          // Ignore cleanup errors
        });
        throw error;
      }
    } catch (error) {
      this.loggingService.error(
        'Error scanning file for viruses',
        error instanceof Error ? error.stack : undefined,
        'ClamAVScannerService',
        {
          category: LogCategory.STORAGE,
          metadata: { filename },
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      // On error, we can either fail-safe (allow) or fail-secure (reject)
      // For now, we'll log and allow (fail-safe) to prevent blocking uploads if ClamAV is down
      return {
        isInfected: false,
        threats: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Scan a file using ClamAV
   * @param filePath - Path to file to scan
   * @returns Scan result
   */
  private async scanFile(filePath: string): Promise<ScanResult> {
    if (this.useSocket) {
      return this.scanFileViaSocket(filePath);
    } else {
      return this.scanFileViaCommand(filePath);
    }
  }

  /**
   * Scan file using clamdscan command (requires clamd running)
   */
  private async scanFileViaCommand(filePath: string): Promise<ScanResult> {
    try {
      // Use clamdscan which connects to clamd daemon
      // Format: clamdscan --no-summary --infected <file>
      const { stdout, stderr } = await execAsync(
        `clamdscan --no-summary --infected "${filePath}"`,
        { timeout: this.timeout },
      );

      // clamdscan returns:
      // - Exit code 0: File is clean
      // - Exit code 1: File is infected
      // - Exit code 2: Error occurred

      if (stderr) {
        // Check if it's an infection message
        const infectedMatch = stderr.match(/^(.+): (.+) FOUND$/m);
        if (infectedMatch) {
          const threat = infectedMatch[2];
          return {
            isInfected: true,
            threats: [threat],
          };
        }

        // Check for errors
        if (stderr.includes('ERROR') || stderr.includes('Can\'t connect')) {
          throw new Error(`ClamAV error: ${stderr}`);
        }
      }

      // If stdout contains "FOUND", file is infected
      if (stdout.includes('FOUND')) {
        const threats = stdout
          .split('\n')
          .filter((line) => line.includes('FOUND'))
          .map((line) => {
            const match = line.match(/:\s*(.+)\s+FOUND$/);
            return match ? match[1] : 'Unknown threat';
          });

        return {
          isInfected: true,
          threats,
        };
      }

      // File is clean
      return {
        isInfected: false,
        threats: [],
      };
    } catch (error: any) {
      // Check if it's an infection (exit code 1)
      if (error.code === 1 && error.stderr) {
        const infectedMatch = error.stderr.match(/^(.+): (.+) FOUND$/m);
        if (infectedMatch) {
          const threat = infectedMatch[2];
          return {
            isInfected: true,
            threats: [threat],
          };
        }
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Scan file using ClamAV socket (more efficient for high-volume scanning)
   * Uses clamdscan with socket path
   */
  private async scanFileViaSocket(filePath: string): Promise<ScanResult> {
    try {
      // Use clamdscan with socket path
      const { stdout, stderr } = await execAsync(
        `clamdscan --fdpass --no-summary --infected "${filePath}"`,
        { timeout: this.timeout },
      );

      if (stderr) {
        const infectedMatch = stderr.match(/^(.+): (.+) FOUND$/m);
        if (infectedMatch) {
          const threat = infectedMatch[2];
          return {
            isInfected: true,
            threats: [threat],
          };
        }

        if (stderr.includes('ERROR') || stderr.includes('Can\'t connect')) {
          throw new Error(`ClamAV error: ${stderr}`);
        }
      }

      if (stdout.includes('FOUND')) {
        const threats = stdout
          .split('\n')
          .filter((line) => line.includes('FOUND'))
          .map((line) => {
            const match = line.match(/:\s*(.+)\s+FOUND$/);
            return match ? match[1] : 'Unknown threat';
          });

        return {
          isInfected: true,
          threats,
        };
      }

      return {
        isInfected: false,
        threats: [],
      };
    } catch (error: any) {
      if (error.code === 1 && error.stderr) {
        const infectedMatch = error.stderr.match(/^(.+): (.+) FOUND$/m);
        if (infectedMatch) {
          const threat = infectedMatch[2];
          return {
            isInfected: true,
            threats: [threat],
          };
        }
      }

      throw error;
    }
  }

  /**
   * Check if ClamAV scanning is enabled and available
   */
  isEnabled(): boolean {
    return this.enabled && this.isAvailable;
  }
}

