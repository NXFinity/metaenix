'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/core/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/core/api/admin/admin.service';
import { MainLayout } from '@/Theme/layout/MainLayout';
import {
  Heading,
  Text,
  Flex,
  Box,
  Card,
  TextField,
  Button,
  Table,
  Dialog,
  DropdownMenu,
  Badge,
  Separator,
} from '@radix-ui/themes';
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Edit,
  Trash2,
  Shield,
  UserCheck,
  UserX,
  AlertTriangle,
  ArrowLeft as ArrowLeftIcon,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const ADMIN_ROLES = ['Administrator', 'Founder', 'Chief Executive'];

const isAdmin = (role: string | undefined): boolean => {
  if (!role) return false;
  return ADMIN_ROLES.includes(role);
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

interface User {
  id: string;
  username: string;
  displayName: string;
  role: string;
  dateCreated?: string;
  dateDeleted?: string;
  profile?: {
    avatar?: string;
  };
  security?: {
    isBanned?: boolean;
  };
}

export default function AdminUsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: currentUser, isAuthenticated, isInitializing } = useAuth();

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    username: '',
    displayName: '',
    role: '',
  });

  useEffect(() => {
    if (!isInitializing) {
      if (!isAuthenticated) {
        router.push('/');
        return;
      }
      if (currentUser && !isAdmin(currentUser.role)) {
        router.push('/');
        return;
      }
    }
  }, [currentUser, isAuthenticated, isInitializing, router]);

  // Fetch users
  const {
    data: usersData,
    isLoading: isLoadingUsers,
    error: usersError,
  } = useQuery({
    queryKey: ['admin', 'users', page, limit, searchQuery],
    queryFn: () =>
      adminService.searchUsers({
        q: searchQuery || '',
        page,
        limit,
      }),
    enabled: isAuthenticated && !!currentUser && isAdmin(currentUser.role),
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      adminService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    },
  });

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleUpdateUser = () => {
    if (!selectedUser) return;
    updateUserMutation.mutate({
      id: selectedUser.id,
      data: editFormData,
    });
  };

  const handleDeleteUser = () => {
    if (!selectedUser) return;
    deleteUserMutation.mutate(selectedUser.id);
  };

  if (isInitializing) {
    return (
      <MainLayout>
        <Flex align="center" justify="center" style={{ minHeight: '400px' }}>
          <Text size="3" color="gray">Loading...</Text>
        </Flex>
      </MainLayout>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <MainLayout>
        <Flex align="center" justify="center" style={{ minHeight: '400px' }}>
          <Text size="3" color="red">Authentication Required</Text>
        </Flex>
      </MainLayout>
    );
  }

  if (!isAdmin(currentUser.role)) {
    return (
      <MainLayout>
        <Flex align="center" justify="center" style={{ minHeight: '400px' }}>
          <Text size="3" color="red">Access Denied</Text>
        </Flex>
      </MainLayout>
    );
  }

  const users = usersData?.data || [];
  const meta = usersData?.meta;
  const totalPages = meta?.totalPages || 1;

  return (
    <MainLayout>
      <Box style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <Flex direction="column" gap="4" mb="6">
          <Flex align="center" gap="4">
            <Button variant="ghost" size="2" asChild>
              <Link href="/admin">
                <ArrowLeftIcon size={16} style={{ marginRight: '8px' }} />
                Back to Dashboard
              </Link>
            </Button>
            <Separator orientation="vertical" style={{ height: '24px' }} />
            <Flex align="center" gap="3">
              <Box
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--accent-3)',
                  color: 'var(--accent-9)',
                }}
              >
                <Users size={24} />
              </Box>
              <Flex direction="column" gap="1">
                <Flex align="center" gap="2">
                  <Heading size="9" weight="bold">User Management</Heading>
                  <Badge color="orange" size="2">
                    <Shield size={12} style={{ marginRight: '4px' }} />
                    Admin
                  </Badge>
                </Flex>
                <Text size="3" color="gray">
                  Manage users, roles, and permissions
                </Text>
              </Flex>
            </Flex>
          </Flex>
        </Flex>

        <Separator size="4" mb="6" />

        {/* Search */}
        <Card mb="6">
          <Box p="4">
            <TextField.Root
              size="3"
              placeholder="Search users by username or display name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            >
              <TextField.Slot>
                <Search size="16" />
              </TextField.Slot>
            </TextField.Root>
          </Box>
        </Card>

        {/* Users Table */}
        {isLoadingUsers ? (
          <Flex align="center" justify="center" style={{ minHeight: '200px' }}>
            <Text size="3" color="gray">Loading users...</Text>
          </Flex>
        ) : usersError ? (
          <Card>
            <Box p="6">
              <Flex direction="column" align="center" gap="2">
                <Text size="4" weight="bold" color="red">
                  Failed to Load Users
                </Text>
                <Text size="2" color="gray">
                  {usersError instanceof Error ? usersError.message : 'An error occurred'}
                </Text>
                <Button
                  variant="soft"
                  mt="4"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })}
                >
                  Retry
                </Button>
              </Flex>
            </Box>
          </Card>
        ) : users.length === 0 ? (
          <Card>
            <Box p="6">
              <Flex direction="column" align="center" gap="2">
                <Users size={48} style={{ color: 'var(--gray-9)', marginBottom: '8px' }} />
                <Text size="4" weight="bold">
                  No Users Found
                </Text>
                <Text size="2" color="gray">
                  {searchQuery ? 'No users match your search criteria' : 'No users found'}
                </Text>
              </Flex>
            </Box>
          </Card>
        ) : (
          <>
            <Card>
              <Box p="4">
                <Flex direction="column" gap="4">
                  <Flex align="center" justify="between">
                    <Flex direction="column" gap="1">
                      <Heading size="5" weight="bold">Users</Heading>
                      <Text size="2" color="gray">
                        {meta?.total ? `Total: ${meta.total} users` : 'User list'}
                      </Text>
                    </Flex>
                  </Flex>

                  <Table.Root>
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeaderCell>User</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Created</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell style={{ textAlign: 'right' }}>
                          Actions
                        </Table.ColumnHeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {users.map((user) => (
                        <Table.Row key={user.id}>
                          <Table.Cell>
                            <Flex align="center" gap="3">
                              <Box
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--accent-3)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  overflow: 'hidden',
                                }}
                              >
                                {user.profile?.avatar ? (
                                  <Image
                                    src={user.profile.avatar}
                                    alt={user.displayName}
                                    width={40}
                                    height={40}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                    }}
                                  />
                                ) : (
                                  <Text size="2" weight="bold" style={{ color: 'var(--accent-9)' }}>
                                    {user.displayName?.[0]?.toUpperCase() || 'U'}
                                  </Text>
                                )}
                              </Box>
                              <Flex direction="column" gap="1">
                                <Text size="2" weight="medium">
                                  {user.displayName}
                                </Text>
                                <Text size="1" color="gray">
                                  @{user.username}
                                </Text>
                              </Flex>
                            </Flex>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge
                              color={isAdmin(user.role) ? 'purple' : 'gray'}
                              size="2"
                            >
                              {isAdmin(user.role) && (
                                <Shield size={12} style={{ marginRight: '4px' }} />
                              )}
                              {user.role}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            {user.dateDeleted ? (
                              <Badge color="red" size="2">
                                <UserX size={12} style={{ marginRight: '4px' }} />
                                Deleted
                              </Badge>
                            ) : user.security?.isBanned ? (
                              <Badge color="orange" size="2">
                                <AlertTriangle size={12} style={{ marginRight: '4px' }} />
                                Banned
                              </Badge>
                            ) : (
                              <Badge color="green" size="2">
                                <UserCheck size={12} style={{ marginRight: '4px' }} />
                                Active
                              </Badge>
                            )}
                          </Table.Cell>
                          <Table.Cell>
                            <Text size="2" color="gray">
                              {formatDate(user.dateCreated)}
                            </Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Flex align="center" justify="end" gap="2">
                              <DropdownMenu.Root>
                                <DropdownMenu.Trigger>
                                  <Button variant="ghost" size="2">
                                    <MoreVertical size={16} />
                                  </Button>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Content>
                                  <DropdownMenu.Item onClick={() => handleEdit(user)}>
                                    <Edit size={16} style={{ marginRight: '8px' }} />
                                    Edit User
                                  </DropdownMenu.Item>
                                  <DropdownMenu.Item
                                    color="red"
                                    onClick={() => handleDelete(user)}
                                  >
                                    <Trash2 size={16} style={{ marginRight: '8px' }} />
                                    Delete User
                                  </DropdownMenu.Item>
                                </DropdownMenu.Content>
                              </DropdownMenu.Root>
                            </Flex>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Flex>
              </Box>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <Flex align="center" justify="between" mt="6">
                <Text size="2" color="gray">
                  Page {page} of {totalPages} • {meta?.total || 0} total users
                </Text>
                <Flex gap="2">
                  <Button
                    variant="outline"
                    size="2"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft size={16} style={{ marginRight: '4px' }} />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="2"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                    <ChevronRight size={16} style={{ marginLeft: '4px' }} />
                  </Button>
                </Flex>
              </Flex>
            )}
          </>
        )}
      </Box>

      {/* Edit User Dialog */}
      <Dialog.Root open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <Dialog.Content style={{ maxWidth: '500px' }}>
          <Dialog.Title>Edit User</Dialog.Title>
          <Dialog.Description>
            Update user information. Changes will be saved immediately.
          </Dialog.Description>

          <Flex direction="column" gap="4" mt="4">
            <Box>
              <Text size="2" weight="medium" mb="2" as="label" htmlFor="username">
                Username
              </Text>
              <TextField.Root
                id="username"
                value={editFormData.username}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, username: e.target.value })
                }
              />
            </Box>
            <Box>
              <Text size="2" weight="medium" mb="2" as="label" htmlFor="displayName">
                Display Name
              </Text>
              <TextField.Root
                id="displayName"
                value={editFormData.displayName}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, displayName: e.target.value })
                }
              />
            </Box>
            <Box>
              <Text size="2" weight="medium" mb="2" as="label" htmlFor="role">
                Role
              </Text>
              <TextField.Root
                id="role"
                value={editFormData.role}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, role: e.target.value })
                }
                placeholder="Member, Administrator, etc."
              />
            </Box>
          </Flex>

          <Flex gap="3" mt="6" justify="end">
            <Dialog.Close>
              <Button
                variant="soft"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={updateUserMutation.isPending}
              >
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              onClick={handleUpdateUser}
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Delete User Dialog */}
      <Dialog.Root open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <Dialog.Content style={{ maxWidth: '500px' }}>
          <Dialog.Title>Delete User</Dialog.Title>
          <Dialog.Description>
            Are you sure you want to delete <strong>{selectedUser?.displayName}</strong>? This
            action cannot be undone and will permanently delete the user account and all
            associated data.
          </Dialog.Description>

          <Flex gap="3" mt="6" justify="end">
            <Dialog.Close>
              <Button
                variant="soft"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={deleteUserMutation.isPending}
              >
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              color="red"
              onClick={handleDeleteUser}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </MainLayout>
  );
}
