import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { Workshop } from './entities/workshop.entity.js';
import { HotelsService } from './workshops.service.js';

@ApiTags('Hotels')
@ApiSecurity('API Key')
@ApiSecurity('User')
@Controller('hotels')
export class HotelsController {
  constructor(private readonly hotelsService: HotelsService) {}

  @Get()
  @Roles(Role.ADMIN,  Role.TECHNICIAN)
  @ApiOperation({
    summary: 'List the branches of the chain',
    description: 'Read-only master data: Via 40, Rio Riverwalk and North city branches.',
  })
  @ApiOkResponse({
    description: 'Branch list',
    schema: {
      example: {
        success: true,
        data: [{ id: 1, name: 'Arenosa Via 40', location: 'Via 40 corridor', active: true }],
      },
    },
  })
  findAll(): Promise<Workshop[]> {
    return this.hotelsService.findAll();
  }
}
