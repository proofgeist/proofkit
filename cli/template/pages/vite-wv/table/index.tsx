import { createFileRoute } from "@tanstack/react-router";
import {
  MantineReactTable,
  MRT_ColumnDef,
  useMantineReactTable,
} from "mantine-react-table";
import { __CLIENT_NAME__ } from "@/config/schemas/__SOURCE_NAME__/client";
import { Stack, Text } from "@mantine/core";
import FullScreenLoader from "@/components/full-screen-loader";
export const Route = createFileRoute("/")({
  component: RouteComponent,
  pendingComponent: () => <FullScreenLoader />,
  loader: async () => {
    // this function is limited to 100 records by default. To load more, see the other table templates from the docs
    const { data } = await __CLIENT_NAME__.list();
    return data.map((record) => record.fieldData);
  },
});

type TData = ReturnType<typeof Route.useLoaderData>;

const columns: MRT_ColumnDef<TData>[] = [];

function RouteComponent() {
  const data = Route.useLoaderData();
  const table = useMantineReactTable({ data, columns });
  return (
    <Stack p="md">
      <Text>This basic table loads up to 100 records by default</Text>
      <MantineReactTable table={table} />
    </Stack>
  );
}
