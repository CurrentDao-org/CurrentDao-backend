import { EnergyQuality } from './energy-quality.entity';
import { Certification } from './certification.entity';
export declare enum EnergyType {
    SOLAR = "solar",
    WIND = "wind",
    HYDRO = "hydro",
    GEOTHERMAL = "geothermal",
    BIOMASS = "biomass",
    NATURAL_GAS = "natural_gas",
    COAL = "coal",
    NUCLEAR = "nuclear",
    OIL = "oil"
}
export declare enum EnergySubType {
    PHOTOVOLTAIC = "photovoltaic",
    CONCENTRATED_SOLAR = "concentrated_solar",
    SOLAR_THERMAL = "solar_thermal",
    ONSHORE_WIND = "onshore_wind",
    OFFSHORE_WIND = "offshore_wind",
    RUN_OF_RIVER = "run_of_river",
    RESERVOIR = "reservoir",
    PUMPED_STORAGE = "pumped_storage",
    SOLID_BIOMASS = "solid_biomass",
    LIQUID_BIOMASS = "liquid_biomass",
    BIOGAS = "biogas"
}
export declare class EnergyCategory {
    id: string;
    energyType: EnergyType;
    name: string;
    description: string;
    subType: EnergySubType;
    parentId: string;
    parent: EnergyCategory;
    children: EnergyCategory[];
    priceMultiplier: number;
    isRenewable: boolean;
    isActive: boolean;
    sortOrder: number;
    tags: string[];
    metadata: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    qualities: EnergyQuality[];
    certifications: Certification[];
}
export declare const DEFAULT_ENERGY_CATEGORIES: {
    energyType: EnergyType;
    name: string;
    description: string;
    subType: any;
    priceMultiplier: number;
    isRenewable: boolean;
    sortOrder: number;
    tags: string[];
}[];
export declare const isRenewableEnergy: (energyType: EnergyType) => boolean;
export declare const getPriceMultiplier: (energyType: EnergyType) => number;
