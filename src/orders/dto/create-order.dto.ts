import { IsEmail, IsNotEmpty, IsNumber, IsString, Min, Max, IsOptional, IsEnum } from "class-validator";
import { ServiceType } from "../entities/order.entity";

export class CreateOrderDto {
    @IsString()
    @IsOptional()
    username?: string; // Zora username

    @IsString()
    @IsOptional()
    walletAddress?: string; // Ethereum wallet address for other services

    @IsNumber()
    @Min(200, { message: 'Minimum amount is 200 NGN'})
    @Max(1600, { message: 'Maximum amount is 1600 NGN'})
    amountNGN: number;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsEnum(ServiceType, { message: 'ServiceType must be one of: zora, baseapp, wallet' })
    @IsOptional()
    serviceType?: ServiceType; // "zora", "baseapp", or "wallet" - identifies the service type
}