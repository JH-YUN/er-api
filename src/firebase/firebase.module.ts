import { Module, DynamicModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FirebaseService } from './firebase.service';
import {
  initializeApp,
  applicationDefault,
  cert,
  ServiceAccount,
} from 'firebase-admin/app';
import { HttpModule } from '@nestjs/axios';

@Module({})
export class FirebaseModule {
  static forRoot(): DynamicModule {
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: Buffer.from(
        process.env.FIREBASE_PRIVATE_KEY,
        'base64',
      ).toString('utf8'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url:
        'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-i4rze%40er-profile.iam.gserviceaccount.com',
    } as ServiceAccount;

    initializeApp({
      credential: cert(serviceAccount),
    });
    return {
      module: FirebaseModule,
      imports: [
        HttpModule.registerAsync({
          useFactory: async (configService: ConfigService) => ({
            headers: { 'x-api-key': configService.get('ER_API_KEY') },
          }),
          inject: [ConfigService],
        }),
      ],
      providers: [FirebaseService],
      exports: [FirebaseService],
    };
  }
}
