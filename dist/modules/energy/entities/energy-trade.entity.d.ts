export interface EnergyTrade {
    id: string;
    sellerId: string;
    buyerId: string;
    amount: number;
    price: number;
    type: 'buy' | 'sell';
    status: 'pending' | 'executed' | 'cancelled';
    createdAt: Date;
    updatedAt: Date;
}
