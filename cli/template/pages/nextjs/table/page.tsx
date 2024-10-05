import React from "react";
import { Stack } from "@mantine/core";
import TableContent from "./table";
import { ContactsLayout } from "@/config/schemas/filemaker/client";

export default async function TablePage() {
  // this function is limited to 100 records by default. To load more, see the other table templates from the docs
  const { data } = await ContactsLayout.list();
  return (
    <Stack>
      <TableContent data={data.map((d) => d.fieldData)} />
    </Stack>
  );
}
