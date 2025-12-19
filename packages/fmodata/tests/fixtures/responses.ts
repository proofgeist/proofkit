/**
 * Mock Response Fixtures
 *
 * This file contains captured responses from real FileMaker OData API calls.
 * These responses are used by the mock fetch implementation to replay API responses
 * in tests without requiring a live server connection.
 *
 * Format:
 * - Each response is keyed by a descriptive query name
 * - Each response object contains:
 *   - url: The full request URL (for matching)
 *   - method: HTTP method (typically "GET")
 *   - status: Response status code
 *   - response: The actual response data (JSON-parsed)
 *
 * To add new mock responses:
 * 1. Add a query definition to scripts/capture-responses.ts
 * 2. Run: pnpm capture
 * 3. The captured response will be added to this file automatically
 *
 * You can manually edit responses here if you need to modify test data.
 */

export type MockResponse = {
  url: string;
  method: string;
  status: number;
  headers?: {
    "content-type"?: string;
    location?: string;
  };
  response: any;
};

export type MockResponses = Record<string, MockResponse>;

/**
 * Captured mock responses from FileMaker OData API
 *
 * These responses are used in tests by passing them to createMockFetch() at the
 * per-execution level. Each test explicitly declares which response it expects.
 */
export const mockResponses = {
  "list-basic": {
    url: "https://api.example.com/otto/fmi/odata/v4/fmdapi_test.fmp12/contacts$top=10",
    method: "GET",
    status: 400,
    headers: {
      "content-type": "application/json;charset=utf-8",
    },
    response: {
      error: {
        code: "-1002",
        message: "Error: syntax error in URL at: '$top'",
      },
    },
  },

  "list-with-select": {
    url: "https://api.example.com/otto/fmi/odata/v4/fmdapi_test.fmp12/contacts?$select=name,PrimaryKey&$top=10",
    method: "GET",
    status: 200,
    headers: {
      "content-type": "application/json;charset=utf-8",
    },
    response: {
      "@context":
        'https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/$metadata#contacts("name","PrimaryKey")',
      value: [
        {
          "@id":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('B5BFBC89-03E0-47FC-ABB6-D51401730227')",
          "@editLink":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('B5BFBC89-03E0-47FC-ABB6-D51401730227')",
          name: "Eric",
          PrimaryKey: "B5BFBC89-03E0-47FC-ABB6-D51401730227",
        },
        {
          "@id":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('D61B338B-B06E-4985-ABFD-CB3B2EF4F4C4')",
          "@editLink":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('D61B338B-B06E-4985-ABFD-CB3B2EF4F4C4')",
          name: "Adam",
          PrimaryKey: "D61B338B-B06E-4985-ABFD-CB3B2EF4F4C4",
        },
        {
          "@id":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('8EE70436-18A8-4FF5-96F0-4DCE721496B2')",
          "@editLink":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('8EE70436-18A8-4FF5-96F0-4DCE721496B2')",
          name: "Ben",
          PrimaryKey: "8EE70436-18A8-4FF5-96F0-4DCE721496B2",
        },
        {
          "@id":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('A16D1D68-6A97-44C9-95FD-70A3206E6B69')",
          "@editLink":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('A16D1D68-6A97-44C9-95FD-70A3206E6B69')",
          name: "Carter",
          PrimaryKey: "A16D1D68-6A97-44C9-95FD-70A3206E6B69",
        },
        {
          "@id":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('35B60054-E7FC-423A-92BD-3FFE5E48C42D')",
          "@editLink":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('35B60054-E7FC-423A-92BD-3FFE5E48C42D')",
          name: "Vance",
          PrimaryKey: "35B60054-E7FC-423A-92BD-3FFE5E48C42D",
        },
        {
          "@id":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('4244DDF7-59E1-4C21-9795-CF0603F4B87F')",
          "@editLink":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('4244DDF7-59E1-4C21-9795-CF0603F4B87F')",
          name: "test2",
          PrimaryKey: "4244DDF7-59E1-4C21-9795-CF0603F4B87F",
        },
        {
          "@id":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('7E0E56EA-DC0C-4C96-89B1-600188F3AC63')",
          "@editLink":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('7E0E56EA-DC0C-4C96-89B1-600188F3AC63')",
          name: "Test User 1762703536689",
          PrimaryKey: "7E0E56EA-DC0C-4C96-89B1-600188F3AC63",
        },
        {
          "@id":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('AD888459-A733-4839-AAB4-3BAEA0CC9BDA')",
          "@editLink":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('AD888459-A733-4839-AAB4-3BAEA0CC9BDA')",
          name: "Update Test 1762703536876 Updated",
          PrimaryKey: "AD888459-A733-4839-AAB4-3BAEA0CC9BDA",
        },
        {
          "@id":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('3AAAF90A-70D8-42FF-910E-AFF5C65FE49B')",
          "@editLink":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('3AAAF90A-70D8-42FF-910E-AFF5C65FE49B')",
          name: "Bulk Update 1762703537073 - 1",
          PrimaryKey: "3AAAF90A-70D8-42FF-910E-AFF5C65FE49B",
        },
        {
          "@id":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('AA35F00A-57F7-46FD-8CAA-C879032E551E')",
          "@editLink":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('AA35F00A-57F7-46FD-8CAA-C879032E551E')",
          name: "Bulk Update 1762703537073 - 2",
          PrimaryKey: "AA35F00A-57F7-46FD-8CAA-C879032E551E",
        },
      ],
    },
  },

  "list-with-orderby": {
    url: "https://api.example.com/otto/fmi/odata/v4/fmdapi_test.fmp12/contacts?$orderby=name&$top=5",
    method: "GET",
    status: 200,
    headers: {
      "content-type": "application/json;charset=utf-8",
    },
    response: {
      "@context":
        "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/$metadata#contacts",
      value: [
        {
          "@id":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('00000000-0000-0000-0000-000000000000')",
          "@editLink":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('00000000-0000-0000-0000-000000000000')",
          PrimaryKey: "00000000-0000-0000-0000-000000000000",
          CreationTimestamp: "2025-12-05T16:36:53Z",
          CreatedBy: "admin",
          ModificationTimestamp: "2025-12-05T16:36:53Z",
          ModifiedBy: "admin",
          name: null,
          hobby: "Should fail",
          id_user: null,
          my_calc: "you betcha",
        },
        {
          "@id":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('D61B338B-B06E-4985-ABFD-CB3B2EF4F4C4')",
          "@editLink":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('D61B338B-B06E-4985-ABFD-CB3B2EF4F4C4')",
          PrimaryKey: "D61B338B-B06E-4985-ABFD-CB3B2EF4F4C4",
          CreationTimestamp: "2025-10-31T11:13:13Z",
          CreatedBy: "admin",
          ModificationTimestamp: "2025-10-31T15:56:07Z",
          ModifiedBy: "admin",
          name: "Adam",
          hobby: "trees",
          id_user: "53D36C9A-8F90-4C21-A38F-F278D4F77718",
          my_calc: "you betcha",
        },
        {
          "@id":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('1FE5EFB1-E42D-4AC1-94BF-9AA6AD11F9CE')",
          "@editLink":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('1FE5EFB1-E42D-4AC1-94BF-9AA6AD11F9CE')",
          PrimaryKey: "1FE5EFB1-E42D-4AC1-94BF-9AA6AD11F9CE",
          CreationTimestamp: "2025-12-05T16:35:10Z",
          CreatedBy: "admin",
          ModificationTimestamp: "2025-12-05T16:35:10Z",
          ModifiedBy: "admin",
          name: "After Delete Fail - 1764974109900",
          hobby: "Should this succeed?",
          id_user: null,
          my_calc: "you betcha",
        },
        {
          "@id":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('D17802D1-7A37-494E-BE57-408129E0B251')",
          "@editLink":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('D17802D1-7A37-494E-BE57-408129E0B251')",
          PrimaryKey: "D17802D1-7A37-494E-BE57-408129E0B251",
          CreationTimestamp: "2025-12-05T16:36:21Z",
          CreatedBy: "admin",
          ModificationTimestamp: "2025-12-05T16:36:21Z",
          ModifiedBy: "admin",
          name: "After Delete Fail - 1764974181090",
          hobby: "Should this succeed?",
          id_user: null,
          my_calc: "you betcha",
        },
        {
          "@id":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('593F9FCC-D71C-42A9-B9DF-AAF1B36C7D84')",
          "@editLink":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('593F9FCC-D71C-42A9-B9DF-AAF1B36C7D84')",
          PrimaryKey: "593F9FCC-D71C-42A9-B9DF-AAF1B36C7D84",
          CreationTimestamp: "2025-12-05T16:36:53Z",
          CreatedBy: "admin",
          ModificationTimestamp: "2025-12-05T16:36:53Z",
          ModifiedBy: "admin",
          name: "After Delete Fail - 1764974213190",
          hobby: "Should this succeed?",
          id_user: null,
          my_calc: "you betcha",
        },
      ],
    },
  },

  "list-with-pagination": {
    url: "https://api.example.com/otto/fmi/odata/v4/fmdapi_test.fmp12/contacts?$top=2&$skip=2",
    method: "GET",
    status: 200,
    headers: {
      "content-type": "application/json;charset=utf-8",
    },
    response: {
      "@context":
        "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/$metadata#contacts",
      value: [
        {
          "@id":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('8EE70436-18A8-4FF5-96F0-4DCE721496B2')",
          "@editLink":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('8EE70436-18A8-4FF5-96F0-4DCE721496B2')",
          PrimaryKey: "8EE70436-18A8-4FF5-96F0-4DCE721496B2",
          CreationTimestamp: "2025-10-31T11:13:16Z",
          CreatedBy: "admin",
          ModificationTimestamp: "2025-10-31T15:56:24Z",
          ModifiedBy: "admin",
          name: "Ben",
          hobby: "zoo",
          id_user: "D1B49B69-DE29-49BC-9BE8-35E0A47D843F",
          my_calc: "you betcha",
        },
        {
          "@id":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('A16D1D68-6A97-44C9-95FD-70A3206E6B69')",
          "@editLink":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('A16D1D68-6A97-44C9-95FD-70A3206E6B69')",
          PrimaryKey: "A16D1D68-6A97-44C9-95FD-70A3206E6B69",
          CreationTimestamp: "2025-10-31T11:13:23Z",
          CreatedBy: "admin",
          ModificationTimestamp: "2025-10-31T11:27:32Z",
          ModifiedBy: "admin",
          name: "Carter",
          hobby: "Cooking",
          id_user: null,
          my_calc: "you betcha",
        },
      ],
    },
  },

  "insert-return-minimal": {
    url: "https://api.example.com/otto/fmi/odata/v4/fmdapi_test.fmp12/contacts",
    method: "GET",
    status: 204,
    headers: {
      "content-type": "application/json;charset=utf-8",
      location:
        "https://acme-dev.ottomatic.cloud/fmi/odata/v4/fmdapi_test.fmp12/contacts(ROWID=11073)",
    },
    response: null,
  },

  insert: {
    url: "https://api.example.com/otto/fmi/odata/v4/fmdapi_test.fmp12/contacts",
    method: "GET",
    status: 201,
    headers: {
      "content-type": "application/json;charset=utf-8",
      location:
        "https://acme-dev.ottomatic.cloud/fmi/odata/v4/fmdapi_test.fmp12/contacts('F88124B8-53D1-482D-9EF9-08BA79702DA5')",
    },
    response: {
      "@context":
        "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/$metadata#contacts/$entity",
      "@id":
        "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('F88124B8-53D1-482D-9EF9-08BA79702DA5')",
      "@editLink":
        "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('F88124B8-53D1-482D-9EF9-08BA79702DA5')",
      PrimaryKey: "F88124B8-53D1-482D-9EF9-08BA79702DA5",
      CreationTimestamp: "2025-12-15T11:32:53Z",
      CreatedBy: "admin",
      ModificationTimestamp: "2025-12-15T11:32:53Z",
      ModifiedBy: "admin",
      name: "Capture test",
      hobby: null,
      id_user: null,
      my_calc: "you betcha",
    },
  },

  "single-record": {
    url: "https://api.example.com/otto/fmi/odata/v4/fmdapi_test.fmp12/contacts('B5BFBC89-03E0-47FC-ABB6-D51401730227')",
    method: "GET",
    status: 200,
    headers: {
      "content-type": "application/json;charset=utf-8",
    },
    response: {
      "@context":
        "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/$metadata#contacts/$entity",
      "@id":
        "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('B5BFBC89-03E0-47FC-ABB6-D51401730227')",
      "@editLink":
        "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('B5BFBC89-03E0-47FC-ABB6-D51401730227')",
      PrimaryKey: "B5BFBC89-03E0-47FC-ABB6-D51401730227",
      CreationTimestamp: "2025-10-31T10:03:27Z",
      CreatedBy: "admin",
      ModificationTimestamp: "2025-10-31T15:55:53Z",
      ModifiedBy: "admin",
      name: "Eric",
      hobby: "Board games",
      id_user: "1A269FA3-82E6-465A-94FA-39EE3F2F9B5D",
      my_calc: "you betcha",
    },
  },

  "error-invalid-field-select": {
    url: "https://api.example.com/otto/fmi/odata/v4/fmdapi_test.fmp12/contacts?$select=InvalidFieldName",
    method: "GET",
    status: 400,
    headers: {
      "content-type": "application/json;charset=utf-8",
    },
    response: {
      error: {
        code: "8309",
        message:
          "The field named 'InvalidFieldName' does not exist in a specified table (9)",
      },
    },
  },

  "error-invalid-field-orderby": {
    url: "https://api.example.com/otto/fmi/odata/v4/fmdapi_test.fmp12/contacts?$orderby=InvalidFieldName",
    method: "GET",
    status: 400,
    headers: {
      "content-type": "application/json;charset=utf-8",
    },
    response: {
      error: {
        code: "8309",
        message:
          "The field named 'InvalidFieldName' does not exist in a specified table (9)",
      },
    },
  },

  "error-invalid-record-id": {
    url: "https://api.example.com/otto/fmi/odata/v4/fmdapi_test.fmp12/contacts('00000000-0000-0000-0000-000000000000')",
    method: "GET",
    status: 200,
    headers: {
      "content-type": "application/json;charset=utf-8",
    },
    response: {
      "@context":
        "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/$metadata#contacts/$entity",
      "@id":
        "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('00000000-0000-0000-0000-000000000000')",
      "@editLink":
        "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('00000000-0000-0000-0000-000000000000')",
      PrimaryKey: "00000000-0000-0000-0000-000000000000",
      CreationTimestamp: "2025-12-05T16:36:53Z",
      CreatedBy: "admin",
      ModificationTimestamp: "2025-12-05T16:36:53Z",
      ModifiedBy: "admin",
      name: null,
      hobby: "Should fail",
      id_user: null,
      my_calc: "you betcha",
    },
  },

  "single-field": {
    url: "https://api.example.com/otto/fmi/odata/v4/fmdapi_test.fmp12/contacts('B5BFBC89-03E0-47FC-ABB6-D51401730227')/name",
    method: "GET",
    status: 200,
    headers: {
      "content-type": "application/json;charset=utf-8",
    },
    response: {
      "@context":
        "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/$metadata#contacts('B5BFBC89-03E0-47FC-ABB6-D51401730227')/name",
      value: "Eric",
    },
  },

  "simple-navigation": {
    url: "https://api.example.com/otto/fmi/odata/v4/fmdapi_test.fmp12/contacts('B5BFBC89-03E0-47FC-ABB6-D51401730227')/users",
    method: "GET",
    status: 200,
    headers: {
      "content-type": "application/json;charset=utf-8",
    },
    response: {
      "@context":
        "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/$metadata#users",
      value: [
        {
          "@id":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/users('1A269FA3-82E6-465A-94FA-39EE3F2F9B5D')",
          "@editLink":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/users('1A269FA3-82E6-465A-94FA-39EE3F2F9B5D')",
          id: "1A269FA3-82E6-465A-94FA-39EE3F2F9B5D",
          CreationTimestamp: "2025-08-03T11:38:20Z",
          CreatedBy: "admin",
          ModificationTimestamp: "2025-11-03T12:34:42Z",
          ModifiedBy: "admin",
          name: "Test User",
          id_customer: "3026B56E-0C6E-4F31-B666-EE8AC5B36542",
        },
      ],
    },
  },

  "list with invalid expand": {
    url: "https://api.example.com/otto/fmi/odata/v4/fmdapi_test.fmp12/contacts?$expand=users($select=not_real_field)",
    method: "GET",
    status: 200,
    headers: {
      "content-type": "application/json;charset=utf-8",
    },
    response: {
      "@context":
        "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/$metadata#contacts",
      value: [
        {
          "@id":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('B5BFBC89-03E0-47FC-ABB6-D51401730227')",
          "@editLink":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('B5BFBC89-03E0-47FC-ABB6-D51401730227')",
          PrimaryKey: "B5BFBC89-03E0-47FC-ABB6-D51401730227",
          CreationTimestamp: "2025-10-31T10:03:27Z",
          CreatedBy: "admin",
          ModificationTimestamp: "2025-10-31T15:55:53Z",
          ModifiedBy: "admin",
          name: "Eric",
          hobby: "Board games",
          id_user: "1A269FA3-82E6-465A-94FA-39EE3F2F9B5D",
          my_calc: "you betcha",
          error: [
            {
              error: {
                code: "8309",
                message:
                  'FQL0009/(1:20): The column named "not_real_field" does not exist in table "users".',
              },
            },
          ],
        },
      ],
    },
  },

  "get with expand": {
    url: "https://api.example.com/otto/fmi/odata/v4/fmdapi_test.fmp12/contacts('B5BFBC89-03E0-47FC-ABB6-D51401730227')?$expand=users",
    method: "GET",
    status: 200,
    headers: {
      "content-type": "application/json;charset=utf-8",
    },
    response: {
      "@context":
        "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/$metadata#contacts/$entity",
      "@id":
        "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('B5BFBC89-03E0-47FC-ABB6-D51401730227')",
      "@editLink":
        "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('B5BFBC89-03E0-47FC-ABB6-D51401730227')",
      PrimaryKey: "B5BFBC89-03E0-47FC-ABB6-D51401730227",
      CreationTimestamp: "2025-10-31T10:03:27Z",
      CreatedBy: "admin",
      ModificationTimestamp: "2025-10-31T15:55:53Z",
      ModifiedBy: "admin",
      name: "Eric",
      hobby: "Board games",
      id_user: "1A269FA3-82E6-465A-94FA-39EE3F2F9B5D",
      my_calc: "you betcha",
      users: [
        {
          "@id":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/users('1A269FA3-82E6-465A-94FA-39EE3F2F9B5D')",
          "@editLink":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/users('1A269FA3-82E6-465A-94FA-39EE3F2F9B5D')",
          id: "1A269FA3-82E6-465A-94FA-39EE3F2F9B5D",
          CreationTimestamp: "2025-08-03T11:38:20Z",
          CreatedBy: "admin",
          ModificationTimestamp: "2025-11-03T12:34:42Z",
          ModifiedBy: "admin",
          name: "Test User",
          id_customer: "3026B56E-0C6E-4F31-B666-EE8AC5B36542",
        },
      ],
    },
  },

  "deep nested expand": {
    url: "https://api.example.com/otto/fmi/odata/v4/fmdapi_test.fmp12/contacts('B5BFBC89-03E0-47FC-ABB6-D51401730227')?$expand=users($expand=user_customer($select=name))",
    method: "GET",
    status: 200,
    headers: {
      "content-type": "application/json;charset=utf-8",
    },
    response: {
      "@context":
        "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/$metadata#contacts/$entity",
      "@id":
        "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('B5BFBC89-03E0-47FC-ABB6-D51401730227')",
      "@editLink":
        "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('B5BFBC89-03E0-47FC-ABB6-D51401730227')",
      PrimaryKey: "B5BFBC89-03E0-47FC-ABB6-D51401730227",
      CreationTimestamp: "2025-10-31T10:03:27Z",
      CreatedBy: "admin",
      ModificationTimestamp: "2025-10-31T15:55:53Z",
      ModifiedBy: "admin",
      name: "Eric",
      hobby: "Board games",
      id_user: "1A269FA3-82E6-465A-94FA-39EE3F2F9B5D",
      my_calc: "you betcha",
      users: [
        {
          "@id":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/users('1A269FA3-82E6-465A-94FA-39EE3F2F9B5D')",
          "@editLink":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/users('1A269FA3-82E6-465A-94FA-39EE3F2F9B5D')",
          id: "1A269FA3-82E6-465A-94FA-39EE3F2F9B5D",
          CreationTimestamp: "2025-08-03T11:38:20Z",
          CreatedBy: "admin",
          ModificationTimestamp: "2025-11-03T12:34:42Z",
          ModifiedBy: "admin",
          name: "Test User",
          id_customer: "3026B56E-0C6E-4F31-B666-EE8AC5B36542",
          user_customer: [
            {
              "@id":
                "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/user_customer('3026B56E-0C6E-4F31-B666-EE8AC5B36542')",
              "@editLink":
                "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/user_customer('3026B56E-0C6E-4F31-B666-EE8AC5B36542')",
              name: "test",
            },
          ],
        },
      ],
    },
  },

  "list with nested expand": {
    url: "https://api.example.com/otto/fmi/odata/v4/fmdapi_test.fmp12/contacts?$top=2&$expand=users($expand=user_customer($select=name))",
    method: "GET",
    status: 200,
    headers: {
      "content-type": "application/json;charset=utf-8",
    },
    response: {
      "@context":
        "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/$metadata#contacts",
      value: [
        {
          "@id":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('B5BFBC89-03E0-47FC-ABB6-D51401730227')",
          "@editLink":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('B5BFBC89-03E0-47FC-ABB6-D51401730227')",
          PrimaryKey: "B5BFBC89-03E0-47FC-ABB6-D51401730227",
          CreationTimestamp: "2025-10-31T10:03:27Z",
          CreatedBy: "admin",
          ModificationTimestamp: "2025-10-31T15:55:53Z",
          ModifiedBy: "admin",
          name: "Eric",
          hobby: "Board games",
          id_user: "1A269FA3-82E6-465A-94FA-39EE3F2F9B5D",
          my_calc: "you betcha",
          users: [
            {
              "@id":
                "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/users('1A269FA3-82E6-465A-94FA-39EE3F2F9B5D')",
              "@editLink":
                "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/users('1A269FA3-82E6-465A-94FA-39EE3F2F9B5D')",
              id: "1A269FA3-82E6-465A-94FA-39EE3F2F9B5D",
              CreationTimestamp: "2025-08-03T11:38:20Z",
              CreatedBy: "admin",
              ModificationTimestamp: "2025-11-03T12:34:42Z",
              ModifiedBy: "admin",
              name: "Test User",
              id_customer: "3026B56E-0C6E-4F31-B666-EE8AC5B36542",
              user_customer: [
                {
                  "@id":
                    "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/user_customer('3026B56E-0C6E-4F31-B666-EE8AC5B36542')",
                  "@editLink":
                    "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/user_customer('3026B56E-0C6E-4F31-B666-EE8AC5B36542')",
                  name: "test",
                },
              ],
            },
          ],
        },
        {
          "@id":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('D61B338B-B06E-4985-ABFD-CB3B2EF4F4C4')",
          "@editLink":
            "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/contacts('D61B338B-B06E-4985-ABFD-CB3B2EF4F4C4')",
          PrimaryKey: "D61B338B-B06E-4985-ABFD-CB3B2EF4F4C4",
          CreationTimestamp: "2025-10-31T11:13:13Z",
          CreatedBy: "admin",
          ModificationTimestamp: "2025-10-31T15:56:07Z",
          ModifiedBy: "admin",
          name: "Adam",
          hobby: "trees",
          id_user: "53D36C9A-8F90-4C21-A38F-F278D4F77718",
          my_calc: "you betcha",
          users: [
            {
              "@id":
                "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/users('53D36C9A-8F90-4C21-A38F-F278D4F77718')",
              "@editLink":
                "https://api.example.com/fmi/odata/v4/fmdapi_test.fmp12/users('53D36C9A-8F90-4C21-A38F-F278D4F77718')",
              id: "53D36C9A-8F90-4C21-A38F-F278D4F77718",
              CreationTimestamp: "2025-10-31T15:55:56Z",
              CreatedBy: "admin",
              ModificationTimestamp: "2025-10-31T15:56:03Z",
              ModifiedBy: "admin",
              name: "adam user",
              id_customer: null,
              user_customer: [],
            },
          ],
        },
      ],
    },
  },
} satisfies MockResponses;
