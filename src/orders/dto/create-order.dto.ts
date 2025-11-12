import { IsEmail, IsNotEmpty, IsNumber, IsString, Min, Max, IsOptional, IsEnum, registerDecorator, ValidationOptions, ValidationArguments } from "class-validator";
import { ServiceType } from "../entities/order.entity";

// Custom validator to ensure either username or walletAddress is provided
function IsUsernameOrWalletAddress(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isUsernameOrWalletAddress',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments): boolean {
                    const obj = args.object as CreateOrderDto;
                    // At least one of username or walletAddress must be provided and not empty
                    const hasUsername = obj.username && obj.username.trim().length > 0;
                    const hasWalletAddress = obj.walletAddress && obj.walletAddress.trim().length > 0;
                    return !!(hasUsername || hasWalletAddress);
                },
                defaultMessage(args: ValidationArguments): string {
                    return 'Either username (for Zora) or walletAddress (for other services) must be provided';
                }
            }
        });
    };
}

export class CreateOrderDto {
    @IsString()
    @IsOptional()
    @IsUsernameOrWalletAddress({ message: 'Either username or walletAddress must be provided' })
    username?: string; // Zora username

    @IsString()
    @IsOptional()
    walletAddress?: string; // Ethereum wallet address for other services

    @IsNumber()
    @Min(200, { message: 'Minimum amount is 200 NGN'})
    @Max(1670, { message: 'Maximum amount is 1670 NGN '})
    amountNGN: number;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsEnum(ServiceType, { message: 'ServiceType must be one of: zora, baseapp, wallet' })
    @IsOptional()
    serviceType?: ServiceType; // "zora", "baseapp", or "wallet" - identifies the service type
}