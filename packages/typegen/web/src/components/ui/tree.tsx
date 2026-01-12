"use client";

import type { ItemInstance } from "@headless-tree/core";
import { ChevronDownIcon, SquareMinus, SquarePlus } from "lucide-react";
import { Slot as SlotPrimitive } from "radix-ui";
import { type CSSProperties, createContext, type HTMLAttributes, useContext } from "react";
import { cn } from "@/lib/utils";

type ToggleIconType = "chevron" | "plus-minus";

interface TreeInstance {
  getContainerProps?: () => HTMLAttributes<HTMLDivElement>;
  getDragLineStyle?: () => CSSProperties;
}

interface TreeContextValue<T = unknown> {
  indent: number;
  currentItem?: ItemInstance<T>;
  tree?: TreeInstance;
  toggleIconType?: ToggleIconType;
}

const TreeContext = createContext<TreeContextValue>({
  indent: 20,
  currentItem: undefined,
  tree: undefined,
  toggleIconType: "plus-minus",
});

function useTreeContext<T = unknown>() {
  return useContext(TreeContext) as TreeContextValue<T>;
}

interface TreeProps extends HTMLAttributes<HTMLDivElement> {
  indent?: number;
  tree?: TreeInstance;
  toggleIconType?: ToggleIconType;
}

function Tree({ indent = 20, tree, className, toggleIconType = "chevron", ...props }: TreeProps) {
  const containerProps = tree?.getContainerProps?.() ?? {};
  const mergedProps = { ...props, ...containerProps };

  // Extract style from mergedProps to merge with our custom styles
  const { style: propStyle, ...otherProps } = mergedProps;

  // Merge styles
  const mergedStyle = {
    ...propStyle,
    "--tree-indent": `${indent}px`,
  } as CSSProperties;

  return (
    <TreeContext.Provider value={{ indent, tree, toggleIconType }}>
      <div className={cn("flex flex-col", className)} data-slot="tree" style={mergedStyle} {...otherProps} />
    </TreeContext.Provider>
  );
}

interface TreeItemProps<T = unknown> extends HTMLAttributes<HTMLButtonElement> {
  item: ItemInstance<T>;
  indent?: number;
  asChild?: boolean;
}

function TreeItem<T = unknown>({ item, className, asChild, children, ...props }: Omit<TreeItemProps<T>, "indent">) {
  const parentContext = useTreeContext<T>();
  const { indent } = parentContext;

  const itemProps = typeof item.getProps === "function" ? item.getProps() : {};
  const mergedProps = { ...props, ...itemProps };

  // Extract style from mergedProps to merge with our custom styles
  const { style: propStyle, ...otherProps } = mergedProps;

  // Merge styles
  const mergedStyle = {
    ...propStyle,
    "--tree-padding": `${item.getItemMeta().level * indent}px`,
  } as CSSProperties;

  const Comp = asChild ? SlotPrimitive.Slot : "button";

  return (
    <TreeContext.Provider value={{ ...parentContext, currentItem: item as ItemInstance<unknown> }}>
      <Comp
        aria-expanded={item.isExpanded()}
        className={cn(
          "z-10 select-none ps-(--tree-padding) not-last:pb-0.5 outline-hidden focus:z-20 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          className,
        )}
        data-drag-target={typeof item.isDragTarget === "function" ? item.isDragTarget() : undefined}
        data-focus={typeof item.isFocused === "function" ? item.isFocused() : undefined}
        data-folder={typeof item.isFolder === "function" ? item.isFolder() : undefined}
        data-search-match={typeof item.isMatchingSearch === "function" ? item.isMatchingSearch() : undefined}
        data-selected={typeof item.isSelected === "function" ? item.isSelected() : undefined}
        data-slot="tree-item"
        style={mergedStyle}
        {...otherProps}
      >
        {children}
      </Comp>
    </TreeContext.Provider>
  );
}

interface TreeItemLabelProps<T = unknown> extends HTMLAttributes<HTMLSpanElement> {
  item?: ItemInstance<T>;
}

function TreeItemLabel<T = unknown>({ item: propItem, children, className, ...props }: TreeItemLabelProps<T>) {
  const { currentItem, toggleIconType } = useTreeContext<T>();
  const item = propItem || currentItem;

  if (!item) {
    console.warn("TreeItemLabel: No item provided via props or context");
    return null;
  }

  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded-sm bg-background in-data-[drag-target=true]:bg-accent in-data-[search-match=true]:bg-blue-50! in-data-[selected=true]:bg-accent px-2 py-1.5 not-in-data-[folder=true]:ps-7 in-data-[selected=true]:text-accent-foreground text-sm in-focus-visible:ring-[3px] in-focus-visible:ring-ring/50 transition-colors hover:bg-accent [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      data-slot="tree-item-label"
      {...props}
    >
      {item.isFolder() &&
        (() => {
          if (toggleIconType === "plus-minus") {
            return item.isExpanded() ? (
              <SquareMinus className="size-3.5 text-muted-foreground" stroke="currentColor" strokeWidth="1" />
            ) : (
              <SquarePlus className="size-3.5 text-muted-foreground" stroke="currentColor" strokeWidth="1" />
            );
          }
          return <ChevronDownIcon className="size-4 in-aria-[expanded=false]:-rotate-90 text-muted-foreground" />;
        })()}
      {children || (typeof item.getItemName === "function" ? item.getItemName() : null)}
    </span>
  );
}

function TreeDragLine({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const { tree } = useTreeContext();

  if (!tree?.getDragLineStyle) {
    console.warn("TreeDragLine: No tree provided via context or tree does not have getDragLineStyle method");
    return null;
  }

  const dragLine = tree.getDragLineStyle();
  return (
    <div
      className={cn(
        "absolute z-30 -mt-px h-0.5 w-[unset] bg-primary before:absolute before:-top-[3px] before:left-0 before:size-2 before:rounded-full before:border-2 before:border-primary before:bg-background",
        className,
      )}
      style={dragLine}
      {...props}
    />
  );
}

export { Tree, TreeItem, TreeItemLabel, TreeDragLine };
