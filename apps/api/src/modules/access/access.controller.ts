import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { AccessService } from "./access.service.js";
import { CreatePermissionDto } from "./dto/create-permission.dto.js";
import { CreateRoleDto } from "./dto/create-role.dto.js";

@Controller("access")
export class AccessController {
  constructor(private readonly accessService: AccessService) {}

  @Get("roles")
  getRoles() {
    return this.accessService.listRoles();
  }

  @Get("permissions")
  getPermissions() {
    return this.accessService.listPermissions();
  }

  @Post("roles")
  createRole(@Body() input: CreateRoleDto) {
    return this.accessService.createRole(input);
  }

  @Post("permissions")
  createPermission(@Body() input: CreatePermissionDto) {
    return this.accessService.createPermission(input);
  }

  @Patch("roles/:roleId/permissions")
  assignPermissions(@Param("roleId") roleId: string, @Body("permissionCodes") permissionCodes: string[] = []) {
    return this.accessService.assignPermissions(roleId, permissionCodes);
  }
}
