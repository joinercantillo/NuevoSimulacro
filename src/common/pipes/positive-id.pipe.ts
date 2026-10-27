import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/**
 * Converts a path parameter into a positive integer.
 *
 * Replaces ParseIntPipe to give a specific message: an identifier is never
 * zero, negative or textual. Used with @Param('id', ParsePositiveIdPipe).
 */
@Injectable()
export class ParsePositiveIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException(
        `"${value}" is not a valid id: it must be a positive integer`,
      );
    }

    return parsed;
  }
}
