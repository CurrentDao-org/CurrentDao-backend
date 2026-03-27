export declare class ShardMetadataEntity {
    id: number;
    shardId: number;
    currentLoad: number;
    totalRecords: number;
    status: string;
    lastRebalanced: Date;
    createdAt: Date;
    updatedAt: Date;
}
