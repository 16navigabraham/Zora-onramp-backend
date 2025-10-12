import { IsEmail, IsNotEmpty, IsNumber, IsString, Min, Max } from "class-validator";

export class CreateOrderDto {
    @IsString()
    @IsNotEmpty()
    username: string;

    @IsNumber()
    @Min(500, { message: 'Minimum amount is 200 NGN'})
    @Max(1600, { message: 'Maximum amount is 1600 NGN'})
    amountNGN: number;

    @IsEmail()
    @IsNotEmpty()
    email: string;
}