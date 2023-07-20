import { BuildingWall } from '~entity/building/variants/wall';
import { BuildingBlock } from '~entity/building/variants/block';
import { BuildingVariant, IBuildingFactory } from '~type/world/entities/building';

export const BUILDINGS: Record<BuildingVariant, IBuildingFactory> = {
  [BuildingVariant.WALL]: BuildingWall,
  [BuildingVariant.BLOCK]: BuildingBlock,
};
