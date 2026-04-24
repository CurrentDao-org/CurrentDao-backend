/**
 * Stellar Controller
 * 
 * REST API for Stellar wallet connections and transactions.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StellarService } from './stellar.service';
import { ConnectWalletDto } from './dto/connect-wallet.dto';
import { SignTransactionDto, SubmitTransactionDto, CheckBalanceDto } from './dto/transaction.dto';
import { Wallet } from './entities/wallet.entity';

@ApiTags('Stellar')
@Controller('api/stellar')
export class StellarController {
  constructor(private readonly stellarService: StellarService) {}

  @Post('wallet/connect')
  @ApiOperation({ summary: 'Connect a Stellar wallet' })
  @ApiResponse({ status: 200, description: 'Wallet connected successfully' })
  @ApiResponse({ status: 400, description: 'Invalid wallet type' })
  @ApiBearerAuth()
  async connectWallet(@Body() dto: ConnectWalletDto, @Query('userId') userId: string) {
    return this.stellarService.connectWallet(userId, dto.walletType, dto.network, dto.name);
  }

  @Post('wallet/disconnect/:id')
  @ApiOperation({ summary: 'Disconnect a Stellar wallet' })
  @ApiResponse({ status: 200, description: 'Wallet disconnected successfully' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  @ApiBearerAuth()
  async disconnectWallet(@Param('id', ParseUUIDPipe) id: string) {
    await this.stellarService.disconnectWallet(id);
    return { success: true, message: 'Wallet disconnected' };
  }

  @Get('wallet/:id')
  @ApiOperation({ summary: 'Get wallet details' })
  @ApiResponse({ status: 200, description: 'Returns wallet information' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  @ApiBearerAuth()
  getWallet(@Param('id', ParseUUIDPipe) id: string): Wallet | null {
    return this.stellarService.getWallet(id);
  }

  @Get('user/:userId/wallets')
  @ApiOperation({ summary: 'Get all wallets for a user' })
  @ApiResponse({ status: 200, description: 'Returns list of user wallets' })
  @ApiBearerAuth()
  getUserWallets(@Param('userId') userId: string): Wallet[] {
    return this.stellarService.getUserWallets(userId);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get account balance' })
  @ApiResponse({ status: 200, description: 'Returns account balances' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @ApiBearerAuth()
  async getBalance(@Query() dto: CheckBalanceDto) {
    return this.stellarService.getBalance(dto.publicKey, dto.assetCode);
  }

  @Post('transaction/sign')
  @ApiOperation({ summary: 'Sign a transaction' })
  @ApiResponse({ status: 200, description: 'Transaction signed successfully' })
  @ApiResponse({ status: 400, description: 'Signing failed' })
  @ApiBearerAuth()
  async signTransaction(@Body() dto: SignTransactionDto) {
    // In production, wallet type would come from the connected wallet session
    return this.stellarService.signTransaction(
      'FREIGHTER', // Default for demo
      dto.publicKey,
      dto.transactionXdr,
    );
  }

  @Post('transaction/submit')
  @ApiOperation({ summary: 'Submit a signed transaction' })
  @ApiResponse({ status: 200, description: 'Transaction submitted successfully' })
  @ApiResponse({ status: 400, description: 'Submission failed' })
  @ApiBearerAuth()
  async submitTransaction(@Body() dto: SubmitTransactionDto) {
    return this.stellarService.submitTransaction(dto.signedTransactionXdr);
  }

  @Get('transaction/:hash/status')
  @ApiOperation({ summary: 'Monitor transaction status' })
  @ApiResponse({ status: 200, description: 'Returns transaction status' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @ApiBearerAuth()
  async monitorTransaction(@Param('hash') hash: string) {
    return this.stellarService.monitorTransaction(hash);
  }
}
