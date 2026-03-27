"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateListingDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_listing_dto_1 = require("./create-listing.dto");
class UpdateListingDto extends (0, swagger_1.PartialType)(create_listing_dto_1.CreateListingDto) {
}
exports.UpdateListingDto = UpdateListingDto;
//# sourceMappingURL=update-listing.dto.js.map