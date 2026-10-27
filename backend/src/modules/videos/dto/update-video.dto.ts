import { PartialType } from '@nestjs/swagger';
import { CreateVideoDto } from './create-video.dto';

/** Every field optional; `status` is deliberately changed through the dedicated
 *  publish/unpublish routes as well, which are easier to authorize and audit. */
export class UpdateVideoDto extends PartialType(CreateVideoDto) {}
