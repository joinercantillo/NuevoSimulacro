import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Returns the already validated user attached to the request by UserGuard.
 *
 * @example
 * create(@CurrentUser() user: User)
 */
export const CurrentUser = createParamDecorator(
  (property: string | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    return property ? user?.[property] : user;
  },
);
