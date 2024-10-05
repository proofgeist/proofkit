"use client";
import { TContacts } from "@/config/schemas/filemaker/Contacts";
import {
  MantineReactTable,
  MRT_ColumnDef,
  useMantineReactTable,
} from "mantine-react-table";

type TData = TContacts;

const columns: MRT_ColumnDef<TData>[] = [
  { header: "First Name", accessorKey: "First Name" },
];

import React from "react";

export default function MyTable({ data }: { data: TData[] }) {
  const table = useMantineReactTable({ data, columns });
  return <MantineReactTable table={table} />;
}
