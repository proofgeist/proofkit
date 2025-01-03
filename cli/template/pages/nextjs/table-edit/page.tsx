import { __CLIENT_NAME__ } from "@/config/schemas/__SOURCE_NAME__/client";
import { Stack, Text, Code } from "@mantine/core";
import React from "react";

import TableContent from "./table";
import { idFieldName } from "./schema";

export default async function TablePage() {
  // this function is limited to 100 records by default. To load more, see the other table templates from the docs
  const { data } = await __CLIENT_NAME__.list({
    fetch: { next: { revalidate: 60 } }, // only call the database at most once every 60 seconds
  });
  return (
    <Stack>
      <div>
        <Text>
          This table allows editing. Double-click on a cell to edit the value.
        </Text>
        <Text size="sm" c="dimmed">
          This feature requries a primary key field on your API layout. If your
          primary key field is not named <Code>{idFieldName}</Code>, update the
          <Code>idFieldName</Code> variable in the code.
        </Text>
      </div>
      <TableContent data={data.map((d) => d.fieldData)} />
    </Stack>
  );
}