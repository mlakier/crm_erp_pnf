import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./health/health.module.js";
import { PlatformModule } from "./platform/platform.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    HealthModule,
    PlatformModule
  ]
})
export class AppModule {}
