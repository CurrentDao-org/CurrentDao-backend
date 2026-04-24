import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ForecastData } from '../forecasting/entities/forecast-data.entity';
import { MultisigWallet } from '../multisig/entities/multisig-wallet.entity';
import { Signature } from '../multisig/entities/signature.entity';
import { MarketSetting } from '../settings/entities/market-setting.entity';
import { UserPreference } from '../settings/entities/user-preference.entity';
import { PriceHistory } from '../pricing/entities/price-history.entity';
import { MarketDataSource } from '../pricing/entities/market-data-source.entity';
import { PriceForecast } from '../pricing/entities/price-forecast.entity';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'currentdao',
    entities: [
      ForecastData,
      MultisigWallet,
      Signature,
      MarketSetting,
      UserPreference,
      PriceHistory,
      MarketDataSource,
      PriceForecast,
    ],
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development',
    autoLoadEntities: true,
  }),
);
