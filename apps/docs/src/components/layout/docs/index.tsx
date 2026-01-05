import { HideIfEmpty } from "fumadocs-core/hide-if-empty";
import Link from "fumadocs-core/link";
import type { PageTree } from "fumadocs-core/server";
import { NavProvider } from "fumadocs-ui/contexts/layout";
import { TreeContextProvider } from "fumadocs-ui/contexts/tree";
import { type GetSidebarTabsOptions, getSidebarTabs } from "fumadocs-ui/utils/get-sidebar-tabs";
import { Languages, Sidebar as SidebarIcon } from "lucide-react";
import { type ComponentProps, type HTMLAttributes, type ReactNode, useMemo } from "react";
import { cn } from "../../../lib/cn";
import { LanguageToggle, LanguageToggleText } from "../../language-toggle";
import { type Option, RootToggle } from "../../root-toggle";
import { LargeSearchToggle, SearchToggle } from "../../search-toggle";
<<<<<<< Updated upstream
=======
// Import and re-export to avoid barrel file pattern
// Import and re-export to avoid barrel file pattern
>>>>>>> Stashed changes
import {
  Sidebar,
  SidebarCollapseTrigger,
  type SidebarComponents,
  SidebarContent,
  SidebarContentMobile,
  SidebarFolder,
  SidebarFolderContent,
  SidebarFolderLink,
  SidebarFolderTrigger,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarPageTree,
  type SidebarProps,
  SidebarTrigger as SidebarTriggerForExport,
  SidebarViewport,
} from "../../sidebar";
import { ThemeToggle } from "../../theme-toggle";
import { buttonVariants } from "../../ui/button";
<<<<<<< Updated upstream
import type { IconItemType, LinkItemType } from "../shared/index";
import { type BaseLayoutProps, BaseLinkItem, getLinks } from "../shared/index";
import { CollapsibleControl, LayoutBody, Navbar } from "./client";

export { SidebarTrigger } from "../../sidebar";
export type { IconItemType, LinkItemType } from "../shared/index";
export { CollapsibleControl, LayoutBody, Navbar } from "./client";
=======
import type { IconItemType as IconItemTypeImport, LinkItemType as LinkItemTypeImport } from "../shared/index";
import { type BaseLayoutProps, BaseLinkItem, getLinks } from "../shared/index";
import {
  CollapsibleControl as CollapsibleControlImport,
  LayoutBody as LayoutBodyImport,
  Navbar as NavbarImport,
} from "./client";
export const SidebarTrigger = SidebarTriggerForExport;
export type IconItemType = IconItemTypeImport;
export type LinkItemType = LinkItemTypeImport;
export const CollapsibleControl = CollapsibleControlImport;
export const LayoutBody = LayoutBodyImport;
export const Navbar = NavbarImport;
>>>>>>> Stashed changes

export interface DocsLayoutProps extends BaseLayoutProps {
  tree: PageTree.Root;

  sidebar?: SidebarOptions;

  /**
   * Props for the `div` container
   */
  containerProps?: HTMLAttributes<HTMLDivElement>;
}

interface SidebarOptions extends ComponentProps<"aside">, Pick<SidebarProps, "defaultOpenLevel" | "prefetch"> {
  enabled?: boolean;
  component?: ReactNode;
  components?: Partial<SidebarComponents>;

  /**
   * Root Toggle options
   */
  tabs?: Option[] | GetSidebarTabsOptions | false;

  banner?: ReactNode;
  footer?: ReactNode;

  /**
   * Support collapsing the sidebar on desktop mode
   *
   * @defaultValue true
   */
  collapsible?: boolean;
}

export function DocsLayout({
  nav: { transparentMode, ...nav } = {},
  sidebar: { tabs: sidebarTabs, enabled: sidebarEnabled = true, ...sidebarProps } = {},
  searchToggle = {},
  disableThemeSwitch = false,
  themeSwitch = { enabled: !disableThemeSwitch },
  i18n = false,
  children,
  ...props
}: DocsLayoutProps) {
  const tabs = useMemo(() => {
    if (Array.isArray(sidebarTabs)) {
      return sidebarTabs;
    }
    if (typeof sidebarTabs === "object") {
      return getSidebarTabs(props.tree, sidebarTabs);
    }
    if (sidebarTabs !== false) {
      return getSidebarTabs(props.tree);
    }
    return [];
  }, [sidebarTabs, props.tree]);
  const links = getLinks(props.links ?? [], props.githubUrl);
  const sidebarVariables = cn("md:[--fd-sidebar-width:268px] lg:[--fd-sidebar-width:286px]");

  function sidebar() {
    const {
      footer,
      banner,
      collapsible = true,
      component,
      components,
      defaultOpenLevel,
      prefetch,
      ...rest
    } = sidebarProps;
    if (component) {
      return component;
    }

    const iconLinks = links.filter((item): item is IconItemType => item.type === "icon");

    const viewport = (
      <SidebarViewport>
        {links
          .filter((v) => v.type !== "icon")
          .map((item, i, list) => (
            <SidebarLinkItem className={cn(i === list.length - 1 && "mb-4")} item={item} key={i} />
          ))}
        <SidebarPageTree components={components} />
      </SidebarViewport>
    );

    const mobile = (
      <SidebarContentMobile {...rest}>
        <SidebarHeader>
          <div className="flex items-center gap-1.5 text-fd-muted-foreground">
            <div className="flex flex-1">
              {iconLinks.map((item, i) => (
                <BaseLinkItem
                  aria-label={item.label}
                  className={cn(
                    buttonVariants({
                      size: "icon-sm",
                      color: "ghost",
                      className: "p-2",
                    }),
                  )}
                  item={item}
                  key={i}
                >
                  {item.icon}
                </BaseLinkItem>
              ))}
            </div>
            {i18n ? (
              <LanguageToggle>
                <Languages className="size-4.5" />
                <LanguageToggleText />
              </LanguageToggle>
            ) : null}
            {themeSwitch.enabled !== false &&
              (themeSwitch.component ?? <ThemeToggle className="p-0" mode={themeSwitch.mode} />)}
<<<<<<< Updated upstream
            <SidebarTrigger
=======
            <SidebarTriggerForExport
>>>>>>> Stashed changes
              className={cn(
                buttonVariants({
                  color: "ghost",
                  size: "icon-sm",
                  className: "p-2",
                }),
              )}
            >
              <SidebarIcon />
            </SidebarTriggerForExport>
          </div>
          {tabs.length > 0 && <RootToggle options={tabs} />}
          {banner}
        </SidebarHeader>
        {viewport}
        <SidebarFooter className="empty:hidden">{footer}</SidebarFooter>
      </SidebarContentMobile>
    );

    const content = (
      <SidebarContent {...rest}>
        <SidebarHeader>
          <div className="flex">
            <Link className="me-auto inline-flex items-center gap-2.5 font-medium text-[15px]" href={nav.url ?? "/"}>
              {nav.title}
            </Link>
            {nav.children}
            {collapsible && (
              <SidebarCollapseTrigger
                className={cn(
                  buttonVariants({
                    color: "ghost",
                    size: "icon-sm",
                    className: "mb-auto text-fd-muted-foreground",
                  }),
                )}
              >
                <SidebarIcon />
              </SidebarCollapseTrigger>
            )}
          </div>
          {searchToggle.enabled !== false && (searchToggle.components?.lg ?? <LargeSearchToggle hideIfDisabled />)}
          {tabs.length > 0 && <RootToggle options={tabs} />}

          {banner}
        </SidebarHeader>
        {viewport}
        <HideIfEmpty as={SidebarFooter}>
          <div className="flex items-center text-fd-muted-foreground empty:hidden">
            {i18n ? (
              <LanguageToggle>
                <Languages className="size-4.5" />
              </LanguageToggle>
            ) : null}
            {iconLinks.map((item, i) => (
              <BaseLinkItem
                aria-label={item.label}
                className={cn(buttonVariants({ size: "icon-sm", color: "ghost" }))}
                item={item}
                key={i}
              >
                {item.icon}
              </BaseLinkItem>
            ))}
            {themeSwitch.enabled !== false &&
              (themeSwitch.component ?? <ThemeToggle className="ms-auto p-0" mode={themeSwitch.mode} />)}
          </div>
          {footer}
        </HideIfEmpty>
      </SidebarContent>
    );

    return (
      <Sidebar
        Content={
          <>
            {collapsible && <CollapsibleControl />}
            {content}
          </>
        }
        defaultOpenLevel={defaultOpenLevel}
        Mobile={mobile}
        prefetch={prefetch}
      />
    );
  }

  return (
    <TreeContextProvider tree={props.tree}>
      <NavProvider transparentMode={transparentMode}>
        {nav.enabled !== false &&
          (nav.component ?? (
            <Navbar className="h-(--fd-nav-height) on-root:[--fd-nav-height:56px] md:hidden md:on-root:[--fd-nav-height:0px]">
              <Link className="inline-flex items-center gap-2.5 font-semibold" href={nav.url ?? "/"}>
                {nav.title}
              </Link>
              <div className="flex-1">{nav.children}</div>
              {searchToggle.enabled !== false &&
                (searchToggle.components?.sm ?? <SearchToggle className="p-2" hideIfDisabled />)}
              {sidebarEnabled && (
                <SidebarTriggerForExport
                  className={cn(
                    buttonVariants({
                      color: "ghost",
                      size: "icon-sm",
                      className: "p-2",
                    }),
                  )}
                >
                  <SidebarIcon />
                </SidebarTriggerForExport>
              )}
            </Navbar>
          ))}
        <LayoutBody
          {...props.containerProps}
          className={cn(
            "xl:[--fd-toc-width:286px] md:[&_#nd-page_article]:pt-12 xl:[&_#nd-page_article]:px-8",
            sidebarEnabled && sidebarVariables,
            props.containerProps?.className,
          )}
        >
          {sidebarEnabled && sidebar()}
          {children}
        </LayoutBody>
      </NavProvider>
    </TreeContextProvider>
  );
}

function SidebarLinkItem({ item, ...props }: { item: Exclude<LinkItemType, { type: "icon" }>; className?: string }) {
  if (item.type === "menu") {
    return (
      <SidebarFolder {...props}>
        {item.url ? (
          <SidebarFolderLink external={item.external} href={item.url}>
            {item.icon}
            {item.text}
          </SidebarFolderLink>
        ) : (
          <SidebarFolderTrigger>
            {item.icon}
            {item.text}
          </SidebarFolderTrigger>
        )}
        <SidebarFolderContent>
          {item.items.map((child, i) => (
            <SidebarLinkItem item={child} key={i} />
          ))}
        </SidebarFolderContent>
      </SidebarFolder>
    );
  }

  if (item.type === "custom") {
    return <div {...props}>{item.children}</div>;
  }

  return (
    <SidebarItem external={item.external} href={item.url} icon={item.icon} {...props}>
      {item.text}
    </SidebarItem>
  );
}

// Re-exports are handled above
