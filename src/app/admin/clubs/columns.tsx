"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/icons";
import type { ClubWithId } from "@/types";
import { ClubStatusIndicator } from "@/components/clubs/ClubStatusIndicator";
import { getClubStatus, formatDate } from "@/lib/utils";
import { DeleteClubDialog } from "@/components/admin/DeleteClubDialog";

export const columns: ColumnDef<ClubWithId>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <Icons.arrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: "address",
    header: "Address",
    cell: ({ row }) => <div className="truncate max-w-xs">{row.original.address}</div>,
  },
  {
    accessorKey: "currentCount",
    header: "Crowd",
    cell: ({ row }) => {
      const club = row.original;
      const status = getClubStatus(club.currentCount, club.capacityThresholds);
      return (
        <div className="flex items-center space-x-2">
          <ClubStatusIndicator status={status} />
          <span>{club.currentCount}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "lastUpdated",
    header: "Last Updated",
    cell: ({ row }) => formatDate(row.original.lastUpdated),
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const club = row.original;
      const meta = table.options.meta as { refreshData?: () => void } | undefined;

      return (
        <DeleteClubDialog 
            clubId={club.id} 
            clubName={club.name} 
            onDeleted={() => meta?.refreshData?.()}
        >
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <Icons.moreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href={`/admin/clubs/edit/${club.id}`}>
                    <Icons.edit className="mr-2 h-4 w-4" /> Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(club.id)}>
                Copy ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* Trigger for DeleteClubDialog is the DropdownMenuItem itself */}
                <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                     <Icons.trash className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
        </DeleteClubDialog>
      );
    },
  },
];
