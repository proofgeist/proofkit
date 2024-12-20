/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as SecondaryImport } from './routes/secondary'
import { Route as IndexImport } from './routes/index'

// Create/Update Routes

const SecondaryRoute = SecondaryImport.update({
  id: '/secondary',
  path: '/secondary',
  getParentRoute: () => rootRoute,
} as any)

const IndexRoute = IndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/secondary': {
      id: '/secondary'
      path: '/secondary'
      fullPath: '/secondary'
      preLoaderRoute: typeof SecondaryImport
      parentRoute: typeof rootRoute
    }
  }
}

// Create and export the route tree

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/secondary': typeof SecondaryRoute
}

export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/secondary': typeof SecondaryRoute
}

export interface FileRoutesById {
  __root__: typeof rootRoute
  '/': typeof IndexRoute
  '/secondary': typeof SecondaryRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths: '/' | '/secondary'
  fileRoutesByTo: FileRoutesByTo
  to: '/' | '/secondary'
  id: '__root__' | '/' | '/secondary'
  fileRoutesById: FileRoutesById
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  SecondaryRoute: typeof SecondaryRoute
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  SecondaryRoute: SecondaryRoute,
}

export const routeTree = rootRoute
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/secondary"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/secondary": {
      "filePath": "secondary.tsx"
    }
  }
}
ROUTE_MANIFEST_END */
