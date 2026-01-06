import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

// Define input size variants
const inputVariants = cva(
  `
    flex w-full bg-background border border-input shadow-xs shadow-black/5 transition-[color,box-shadow] text-foreground placeholder:text-muted-foreground/80 
    focus-visible:ring-ring/30  focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px]     
    disabled:cursor-not-allowed disabled:opacity-60 
    [&[readonly]]:bg-muted/80 [&[readonly]]:cursor-not-allowed
    file:h-full [&[type=file]]:py-0 file:border-solid file:border-input file:bg-transparent 
    file:font-medium file:not-italic file:text-foreground file:p-0 file:border-0 file:border-e
    aria-invalid:border-destructive/60 aria-invalid:ring-destructive/10 dark:aria-invalid:border-destructive dark:aria-invalid:ring-destructive/20
  `,
  {
    variants: {
      variant: {
        lg: "h-10 rounded-md px-4 text-sm file:me-4 file:pe-4",
        md: "h-9 rounded-md px-3 text-sm file:me-3 file:pe-3",
        sm: "h-8 rounded-md px-2.5 text-xs file:me-2.5 file:pe-2.5",
      },
    },
    defaultVariants: {
      variant: "md",
    },
  },
);

const inputAddonVariants = cva(
  "flex shrink-0 items-center justify-center border border-input bg-muted text-secondary-foreground shadow-[rgba(0,0,0,0.05)] shadow-xs [&_svg]:text-secondary-foreground/60",
  {
    variants: {
      variant: {
        lg: "h-10 min-w-10 rounded-md px-4 text-sm [&_svg:not([class*=size-])]:size-4.5",
        md: "h-9 min-w-9 rounded-md px-3 text-sm [&_svg:not([class*=size-])]:size-4.5",
        sm: "h-8 min-w-7 rounded-md px-2.5 text-xs [&_svg:not([class*=size-])]:size-3.5",
      },
      mode: {
        default: "",
        icon: "justify-center px-0",
      },
    },
    defaultVariants: {
      variant: "md",
      mode: "default",
    },
  },
);

const inputGroupVariants = cva(
  `
    flex items-stretch
    [&_[data-slot=input]]:grow
    [&_[data-slot=input-addon]:has(+[data-slot=input])]:rounded-e-none [&_[data-slot=input-addon]:has(+[data-slot=input])]:border-e-0
    [&_[data-slot=input-addon]:has(+[data-slot=datefield])]:rounded-e-none [&_[data-slot=input-addon]:has(+[data-slot=datefield])]:border-e-0 
    [&_[data-slot=input]+[data-slot=input-addon]]:rounded-s-none [&_[data-slot=input]+[data-slot=input-addon]]:border-s-0
    [&_[data-slot=input-addon]:has(+[data-slot=button])]:rounded-e-none
    [&_[data-slot=input]+[data-slot=button]]:rounded-s-none
    [&_[data-slot=button]+[data-slot=input]]:rounded-s-none
    [&_[data-slot=input-addon]+[data-slot=input]]:rounded-s-none
    [&_[data-slot=input-addon]+[data-slot=datefield]]:[&_[data-slot=input]]:rounded-s-none
    [&_[data-slot=datefield]:has(+[data-slot=input-addon])]:[&_[data-slot=input]]:rounded-e-none
    [&_[data-slot=input]:has(+[data-slot=button])]:rounded-e-none
    [&_[data-slot=input]:has(+[data-slot=input-addon])]:rounded-e-none
    [&_[data-slot=datefield]]:grow
    [&_[data-slot=datefield]+[data-slot=input-addon]]:rounded-s-none 
    [&_[data-slot=datefield]+[data-slot=input-addon]]:border-s-0
    [&_[data-slot=datefield]:has(~[data-slot=input-addon])]:[&_[data-slot=input]]:rounded-e-none
    [&_[data-slot=datefield]~[data-slot=input-addon]]:rounded-s-none
  `,
  {
    variants: {},
    defaultVariants: {},
  },
);

const inputWrapperVariants = cva(
  `
    flex items-center gap-1.5
    has-[:focus-visible]:ring-ring/30 
    has-[:focus-visible]:border-ring
    has-[:focus-visible]:outline-none 
    has-[:focus-visible]:ring-[3px]

    [&_[data-slot=datefield]]:grow 
    [&_[data-slot=input]]:data-focus-within:ring-transparent  
    [&_[data-slot=input]]:data-focus-within:ring-0 
    [&_[data-slot=input]]:data-focus-within:border-0 
    [&_[data-slot=input]]:flex 
    [&_[data-slot=input]]:w-full 
    [&_[data-slot=input]]:outline-none 
    [&_[data-slot=input]]:transition-colors 
    [&_[data-slot=input]]:text-foreground
    [&_[data-slot=input]]:placeholder:text-muted-foreground 
    [&_[data-slot=input]]:border-0 
    [&_[data-slot=input]]:bg-transparent 
    [&_[data-slot=input]]:p-0
    [&_[data-slot=input]]:shadow-none 
    [&_[data-slot=input]]:focus-visible:ring-0 
    [&_[data-slot=input]]:h-auto 
    [&_[data-slot=input]]:disabled:cursor-not-allowed
    [&_[data-slot=input]]:disabled:opacity-50    

    [&_svg]:text-muted-foreground 
    [&_svg]:shrink-0

    has-[[aria-invalid=true]]:border-destructive/60 
    has-[[aria-invalid=true]]:ring-destructive/10 
    dark:has-[[aria-invalid=true]]:border-destructive 
    dark:has-[[aria-invalid=true]]:ring-destructive/20    
  `,
  {
    variants: {
      variant: {
        sm: "gap-1.25 [&_svg:not([class*=size-])]:size-3.5",
        md: "gap-1.5 [&_svg:not([class*=size-])]:size-4",
        lg: "gap-1.5 [&_svg:not([class*=size-])]:size-4",
      },
    },
    defaultVariants: {
      variant: "md",
    },
  },
);

function Input({
  className,
  type,
  variant,
  ...props
}: React.ComponentProps<"input"> & VariantProps<typeof inputVariants>) {
  return <input className={cn(inputVariants({ variant }), className)} data-slot="input" type={type} {...props} />;
}

function InputAddon({
  className,
  variant,
  mode,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputAddonVariants>) {
  return <div className={cn(inputAddonVariants({ variant, mode }), className)} data-slot="input-addon" {...props} />;
}

function InputGroup({ className, ...props }: React.ComponentProps<"div"> & VariantProps<typeof inputGroupVariants>) {
  return <div className={cn(inputGroupVariants(), className)} data-slot="input-group" {...props} />;
}

function InputWrapper({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputWrapperVariants>) {
  return (
    <div
      className={cn(inputVariants({ variant }), inputWrapperVariants({ variant }), className)}
      data-slot="input-wrapper"
      {...props}
    />
  );
}

export { Input, InputAddon, InputGroup, InputWrapper, inputVariants, inputAddonVariants };
