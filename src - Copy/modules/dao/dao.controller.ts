import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { DaoService } from './dao.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller('dao')
@ApiTags('dao')
export class DaoController {
  constructor(private readonly daoService: DaoService) {}

  @Get()
  @ApiOperation({ summary: 'Get all proposals' })
  async findAll() {
    return this.daoService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get proposal by ID' })
  async findOne(@Param('id') id: string) {
    return this.daoService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new proposal' })
  async create(@Body() createProposalDto: CreateProposalDto) {
    return this.daoService.create(createProposalDto);
  }

  @Post(':id/vote')
  @ApiOperation({ summary: 'Vote on proposal' })
  async vote(
    @Param('id') id: string,
    @Body() voteDto: { userId: string; support: boolean },
  ) {
    return this.daoService.vote(id, voteDto.userId, voteDto.support);
  }

  @Post(':id/finalize')
  @ApiOperation({ summary: 'Finalize proposal' })
  async finalize(@Param('id') id: string) {
    return this.daoService.finalize(id);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active proposals' })
  async getActiveProposals() {
    return this.daoService.getActiveProposals();
  }
}
