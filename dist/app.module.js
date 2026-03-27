"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const schedule_1 = require("@nestjs/schedule");
const database_config_1 = __importDefault(require("./config/database.config"));
const stellar_config_1 = __importDefault(require("./config/stellar.config"));
const app_controller_1 = require("./app.controller");
const health_controller_1 = require("./health.controller");
const app_service_1 = require("./app.service");
const market_forecasting_module_1 = require("./forecasting/market-forecasting.module");
const risk_management_module_1 = require("./risk/risk-management.module");
const cross_border_module_1 = require("./cross-border/cross-border.module");
const security_module_1 = require("./security/security.module");
const apm_module_1 = require("./apm/apm.module");
const tracing_module_1 = require("./tracing/tracing.module");
const sharding_module_1 = require("./database/sharding/sharding.module");
const contracts_module_1 = require("./contracts/contracts.module");
const api_gateway_module_1 = require("./gateway/api-gateway.module");
const monitoring_module_1 = require("./monitoring/monitoring.module");
const response_interceptor_1 = require("./common/interceptors/response.interceptor");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [database_config_1.default, stellar_config_1.default],
            }),
            config_1.ConfigModule.forFeature(database_config_1.default),
            config_1.ConfigModule.forFeature(stellar_config_1.default),
            schedule_1.ScheduleModule.forRoot(),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [database_config_1.default.KEY],
                useFactory: (config) => ({
                    ...config,
                }),
            }),
            security_module_1.SecurityModule,
            apm_module_1.ApmModule,
            tracing_module_1.TracingModule,
            sharding_module_1.ShardingModule,
            market_forecasting_module_1.MarketForecastingModule,
            risk_management_module_1.RiskManagementModule,
            cross_border_module_1.CrossBorderModule,
            contracts_module_1.ContractsModule,
            api_gateway_module_1.ApiGatewayModule,
            monitoring_module_1.MonitoringModule,
        ],
        controllers: [app_controller_1.AppController, health_controller_1.HealthController],
        providers: [
            app_service_1.AppService,
            response_interceptor_1.ResponseInterceptor,
            http_exception_filter_1.HttpExceptionFilter,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map