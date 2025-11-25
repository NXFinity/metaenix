'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Marker,
} from 'react-simple-maps';
import { Card, CardContent, CardHeader, CardTitle } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { ZoomInIcon, ZoomOutIcon, RotateCcwIcon } from 'lucide-react';

// World map topology - using a reliable CDN source
const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

interface CountryData {
  countryCode: string;
  countryName: string;
  count: number;
}

interface GeographicMapProps {
  data: CountryData[];
  totalViews: number;
}

// Country code mapping (ISO 3166-1 alpha-2 to ISO 3166-1 alpha-3 for map)
const countryCodeMap: Record<string, string> = {
  US: 'USA',
  GB: 'GBR',
  CA: 'CAN',
  AU: 'AUS',
  DE: 'DEU',
  FR: 'FRA',
  IT: 'ITA',
  ES: 'ESP',
  NL: 'NLD',
  BE: 'BEL',
  CH: 'CHE',
  AT: 'AUT',
  SE: 'SWE',
  NO: 'NOR',
  DK: 'DNK',
  FI: 'FIN',
  PL: 'POL',
  CZ: 'CZE',
  IE: 'IRL',
  PT: 'PRT',
  GR: 'GRC',
  JP: 'JPN',
  CN: 'CHN',
  KR: 'KOR',
  IN: 'IND',
  BR: 'BRA',
  MX: 'MEX',
  AR: 'ARG',
  CL: 'CHL',
  CO: 'COL',
  PE: 'PER',
  ZA: 'ZAF',
  EG: 'EGY',
  NG: 'NGA',
  KE: 'KEN',
  TR: 'TUR',
  SA: 'SAU',
  AE: 'ARE',
  IL: 'ISR',
  RU: 'RUS',
  UA: 'UKR',
  // Add more as needed
};

// Country coordinates for markers (approximate center points)
const countryCoordinates: Record<string, [number, number]> = {
  US: [-95.7129, 37.0902],
  GB: [-3.4360, 55.3781],
  CA: [-106.3468, 56.1304],
  AU: [133.7751, -25.2744],
  DE: [10.4515, 51.1657],
  FR: [2.2137, 46.2276],
  IT: [12.5674, 41.8719],
  ES: [-3.7492, 40.4637],
  NL: [5.2913, 52.1326],
  BE: [4.4699, 50.5039],
  CH: [8.2275, 46.8182],
  AT: [14.5501, 47.5162],
  SE: [18.6435, 60.1282],
  NO: [8.4689, 60.4720],
  DK: [9.5018, 56.2639],
  FI: [25.7482, 61.9241],
  PL: [19.1451, 51.9194],
  CZ: [15.4726, 49.8175],
  IE: [-8.2439, 53.4129],
  PT: [-8.2245, 39.3999],
  GR: [21.8243, 39.0742],
  JP: [138.2529, 36.2048],
  CN: [104.1954, 35.8617],
  KR: [127.7669, 35.9078],
  IN: [78.9629, 20.5937],
  BR: [-51.9253, -14.2350],
  MX: [-102.5528, 23.6345],
  AR: [-63.6167, -38.4161],
  CL: [-71.5430, -35.6751],
  CO: [-74.2973, 4.5709],
  PE: [-75.0152, -9.1900],
  ZA: [22.9375, -30.5595],
  EG: [30.8025, 26.8206],
  NG: [8.6753, 9.0820],
  KE: [37.9062, -0.0236],
  TR: [35.2433, 38.9637],
  SA: [45.0792, 23.8859],
  AE: [53.8478, 23.4241],
  IL: [34.8516, 31.0461],
  RU: [105.3188, 61.5240],
  UA: [31.1656, 48.3794],
};

export const GeographicMap = ({ data, totalViews }: GeographicMapProps) => {
  const [position, setPosition] = useState({ coordinates: [0, 0] as [number, number], zoom: 1 });

  const handleMoveEnd = useCallback((position: { coordinates: [number, number]; zoom: number }) => {
    setPosition(position);
  }, []);

  const handleZoomIn = useCallback(() => {
    setPosition((pos) => ({
      ...pos,
      zoom: Math.min(pos.zoom * 1.5, 8),
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setPosition((pos) => ({
      ...pos,
      zoom: Math.max(pos.zoom / 1.5, 1),
    }));
  }, []);

  const handleReset = useCallback(() => {
    setPosition({ coordinates: [0, 0], zoom: 1 });
  }, []);

  const maxCount = useMemo(() => {
    if (data.length === 0) return 1;
    return Math.max(...data.map((d) => d.count));
  }, [data]);

  const getColor = (count: number) => {
    if (count === 0) return '#e5e7eb';
    const intensity = count / maxCount;
    if (intensity > 0.7) return '#3b82f6'; // Blue
    if (intensity > 0.4) return '#60a5fa'; // Lighter blue
    if (intensity > 0.2) return '#93c5fd'; // Even lighter blue
    return '#dbeafe'; // Lightest blue
  };

  // Get markers for countries with data
  const markers = useMemo(() => {
    return data
      .filter((d) => d.count > 0 && countryCoordinates[d.countryCode])
      .map((d) => ({
        countryCode: d.countryCode,
        countryName: d.countryName,
        count: d.count,
        coordinates: countryCoordinates[d.countryCode],
      }));
  }, [data]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">World Map</CardTitle>
        <p className="text-sm text-muted-foreground">
          Profile views by country ({totalViews.toLocaleString()} total views)
        </p>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[500px] relative border border-border rounded-lg overflow-hidden">
          <ComposableMap
            projectionConfig={{
              scale: 147,
            }}
            className="w-full h-full"
            style={{ width: '100%', height: '100%' }}
          >
            <ZoomableGroup
              zoom={position.zoom}
              center={position.coordinates}
              onMoveEnd={handleMoveEnd}
            >
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    // Try to match by ISO_A3 (3-letter code) first, then ISO_A2 (2-letter code)
                    const countryData = data.find(
                      (d) =>
                        countryCodeMap[d.countryCode] === geo.properties.ISO_A3 ||
                        d.countryCode === geo.properties.ISO_A2,
                    );
                    const count = countryData?.count || 0;
                    const countryName = countryData?.countryName || geo.properties.NAME || '';
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={getColor(count)}
                        stroke="#cbd5e1"
                        strokeWidth={0.5}
                        style={{
                          default: { outline: 'none' },
                          hover: {
                            fill: count > 0 ? '#2563eb' : '#f1f5f9',
                            outline: 'none',
                            cursor: 'pointer',
                          },
                          pressed: { outline: 'none' },
                        }}
                        title={count > 0 ? `${countryName}: ${count.toLocaleString()} views` : countryName}
                      />
                    );
                  })
                }
              </Geographies>
              
              {/* Markers for countries with data */}
              {markers.map((marker) => (
                <Marker key={marker.countryCode} coordinates={marker.coordinates}>
                  <circle
                    r={Math.max(4, Math.min(12, (marker.count / maxCount) * 12))}
                    fill="#ef4444"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    style={{ cursor: 'pointer' }}
                  >
                    <title>{`${marker.countryName}: ${marker.count.toLocaleString()} views`}</title>
                  </circle>
                </Marker>
              ))}
            </ZoomableGroup>
          </ComposableMap>
          
          {/* Zoom Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
            <Button
              variant="secondary"
              size="icon"
              className="h-9 w-9 bg-background/95 hover:bg-background border border-border shadow-lg"
              onClick={handleZoomIn}
              title="Zoom in"
            >
              <ZoomInIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-9 w-9 bg-background/95 hover:bg-background border border-border shadow-lg"
              onClick={handleZoomOut}
              title="Zoom out"
            >
              <ZoomOutIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-9 w-9 bg-background/95 hover:bg-background border border-border shadow-lg"
              onClick={handleReset}
              title="Reset view"
            >
              <RotateCcwIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* Instructions */}
          <div className="absolute bottom-4 left-4 bg-background/95 border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground shadow-lg z-10">
            <p>Drag to pan • Scroll to zoom • Click countries for details</p>
          </div>

          {data.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-0 pointer-events-none">
              <p className="text-muted-foreground">No geographic data available</p>
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#3b82f6] rounded" />
            <span>High ({Math.ceil(maxCount * 0.7)}+ views)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#60a5fa] rounded" />
            <span>Medium ({Math.ceil(maxCount * 0.4)}+ views)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#93c5fd] rounded" />
            <span>Low ({Math.ceil(maxCount * 0.2)}+ views)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

