import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication) {
  const options = new DocumentBuilder()
    .setTitle('Meta EN|IX API')
    .setLicense('META LICENSE', 'https://metaenix.com/license')
    .setVersion('1.0')
    .setDescription(
      'Meta EN|IX Platform API - User management, streaming, and platform services',
    )
    .setContact(
      'Meta EN|IX Support Team',
      'https://metaenix.com/support',
      'support@metaenix.com',
    )
    .setTermsOfService('https://legal.metaenix.com/terms')
    .setExternalDoc('Meta EN|IX Documentation', 'https://docs.metaenix.com')
    .addSecurity('bearer', {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    })
    .addSecurityRequirements('bearer')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, options);
  
  // Sort tags alphabetically
  if (document.tags && document.tags.length > 0) {
    document.tags.sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }
  
  const extraOptions = {
    swaggerOptions: {
      persistAuthorization: true,
      defaultModelsExpandDepth: -1,
      defaultModelExpandDepth: 1,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
      tagsSorter: 'alpha', // Sort tags alphabetically in Swagger UI
    },
    customFavicon: 'https://metaenix.com/favicon.ico',
    customSiteTitle: 'Meta EN|IX API Documentation',
    url: 'https://api.metaenix.com/v1',
    servers: [
      {
        url: 'https://api.metaenix.com/v1',
        description: 'Production',
      },
      {
        url: 'http://localhost:3021/v1',
        description: 'Development',
      },
    ],
  };
  SwaggerModule.setup('/v1', app, document, extraOptions);
}
