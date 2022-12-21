import { Module, DynamicModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FirebaseService } from './firebase.service';
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { HttpModule } from '@nestjs/axios';

@Module({})
export class FirebaseModule {
  static forRoot(): DynamicModule {
    const serviceAccount = require('../../keys/er-profile-firebase-key.json');
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
