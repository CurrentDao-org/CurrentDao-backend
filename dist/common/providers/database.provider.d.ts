import { Provider, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
export interface DatabaseProviderOptions {
    logQueries?: boolean;
    poolSize?: number;
    connectionTimeout?: number;
}
export interface DatabaseHealth {
    connected: boolean;
    type: string;
    database: string;
    timestamp: string;
    activeConnections?: number;
    idleConnections?: number;
}
export declare const DATABASE_PROVIDER = "DATABASE_PROVIDER";
export declare class DatabaseProvider implements OnModuleInit, OnModuleDestroy {
    private readonly dataSource;
    private readonly logger;
    private readonly options;
    constructor(dataSource: DataSource, options?: DatabaseProviderOptions);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    getDataSource(): DataSource;
    getManager(): EntityManager;
    isConnected(): Promise<boolean>;
    getHealth(): Promise<DatabaseHealth>;
    executeTransaction<T>(callback: (manager: EntityManager) => Promise<T>): Promise<T>;
    query<T = any>(sql: string, params?: any[]): Promise<T>;
}
export declare const createDatabaseProvider: (dataSource: DataSource, options?: DatabaseProviderOptions) => Provider;
export declare const InjectDatabaseProvider: () => {
    provide: string;
    useFactory: (dataSource: DataSource) => DatabaseProvider;
    inject: ((dataSource?: DataSource | import("typeorm").DataSourceOptions | string) => ReturnType<typeof Provider>)[];
};
export declare const DATABASE_CONFIG_TOKEN = "DATABASE_CONFIG";
export declare const createDatabaseConfigProvider: () => {
    provide: string;
    useFactory: () => {
        type: string;
        host: string;
        port: number;
        username: string;
        password: string;
        database: string;
        synchronize: boolean;
        logging: boolean;
        autoLoadEntities: boolean;
        poolSize: number;
    };
};
