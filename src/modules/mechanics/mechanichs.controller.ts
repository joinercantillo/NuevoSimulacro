import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { Mechanichs } from './entities/mechanichs.entity.js';
import { ReceptionistsService } from './mechanichs.service.js';

@ApiTags('Receptionists')
@ApiSecurity('API Key')
@ApiSecurity('User')
@Controller('receptionists')
export class ReceptionistsController {
  constructor(private readonly receptionistsService: ReceptionistsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TECHNICIAN)
  @ApiOperation({
    summary: 'List the receptionists of the chain',
    description:
      'Read-only master data. Reservations reference a receptionist through `receptionistId`.',
  })
  @ApiOkResponse({
    description: 'Receptionist list',
    schema: {
      example: {
        success: true,
        data: [{ id: 1, name: 'Maria Rojas', document: '12345678', active: true }],
      },
    },
  })
  findAll(): Promise<Mechanichs[]> {
    return this.receptionistsService.findAll();
  }
}
