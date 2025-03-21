<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create roles
        $superAdmin = Role::create(['name' => 'super_admin']);
        $editor = Role::create(['name' => 'editor']);
        $author = Role::create(['name' => 'author']);
        $viewer = Role::create(['name' => 'viewer']);

        // Create permissions for memos
        $memoPermissions = [
            'view_any_memo',
            'view_memo',
            'create_memo',
            'update_memo',
            'delete_memo',
            'delete_any_memo',
        ];

        // Create permissions for authors
        $authorPermissions = [
            'view_any_author',
            'view_author',
            'create_author',
            'update_author',
            'delete_author',
        ];

        // Create permissions for roles
        $rolePermissions = [
            'view_any_role',
            'view_role',
            'create_role',
            'update_role',
            'delete_role',
        ];

        // Create all permissions
        foreach ([...$memoPermissions, ...$authorPermissions, ...$rolePermissions] as $permission) {
            Permission::create(['name' => $permission]);
        }

        // Create Filament panel access permissions
        Permission::create(['name' => 'access_filament']);

        // Assign permissions to roles
        $editor->givePermissionTo([
            ...$memoPermissions,
            'view_any_author',
            'view_author',
            'access_filament',
        ]);

        $author->givePermissionTo([
            'view_any_memo',
            'view_memo',
            'create_memo',
            'update_memo',
            'delete_memo',
            'access_filament',
        ]);

        // Viewer only gets public viewing permissions (no admin panel access)
        $viewer->givePermissionTo([
            'view_any_memo',
            'view_memo',
        ]);

        // Super admin gets everything
        $superAdmin->givePermissionTo(Permission::all());

        // Create a default super admin user
        $defaultAdmin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@example.com',
            'password' => bcrypt('password'),
        ]);

        $defaultAdmin->assignRole('super_admin');

        // Create a test viewer user
        $viewerUser = User::create([
            'name' => 'Viewer User',
            'email' => 'viewer@example.com',
            'password' => bcrypt('password'),
        ]);

        $viewerUser->assignRole('viewer');
    }
}
