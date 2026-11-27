"use client";

import * as React from "react";
// Parties nommées, jamais l'objet `Command` de cmdk : il porte aussi
// `Command.Dialog`, qui ferait entrer Radix Dialog dans le bundle (#183).
import {
  CommandEmpty as CommandEmptyPrimitive,
  CommandGroup as CommandGroupPrimitive,
  CommandInput as CommandInputPrimitive,
  CommandItem as CommandItemPrimitive,
  CommandList as CommandListPrimitive,
  CommandRoot as CommandRootPrimitive,
  CommandSeparator as CommandSeparatorPrimitive,
} from "cmdk";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

const Command = React.forwardRef<
  React.ElementRef<typeof CommandRootPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandRootPrimitive>
>(({ className, ...props }, ref) => (
  <CommandRootPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md bg-transparent text-on-surface",
      className,
    )}
    {...props}
  />
));
Command.displayName = CommandRootPrimitive.displayName;

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandInputPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandInputPrimitive>
>(({ className, ...props }, ref) => (
  <div
    className="flex items-center border-b border-outline-variant/40 px-3"
    cmdk-input-wrapper=""
  >
    <Search className="mr-2 h-4 w-4 shrink-0 text-on-surface-variant" />
    <CommandInputPrimitive
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-md bg-transparent py-3 text-base outline-none placeholder:text-on-surface-variant disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  </div>
));

CommandInput.displayName = CommandInputPrimitive.displayName;

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandListPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandListPrimitive>
>(({ className, ...props }, ref) => (
  <CommandListPrimitive
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
));

CommandList.displayName = CommandListPrimitive.displayName;

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandEmptyPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandEmptyPrimitive>
>((props, ref) => (
  <CommandEmptyPrimitive
    ref={ref}
    className="py-6 text-center text-sm"
    {...props}
  />
));

CommandEmpty.displayName = CommandEmptyPrimitive.displayName;

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandGroupPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandGroupPrimitive>
>(({ className, ...props }, ref) => (
  <CommandGroupPrimitive
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-on-surface [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-on-surface-variant",
      className,
    )}
    {...props}
  />
));

CommandGroup.displayName = CommandGroupPrimitive.displayName;

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandSeparatorPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandSeparatorPrimitive>
>(({ className, ...props }, ref) => (
  <CommandSeparatorPrimitive
    ref={ref}
    className={cn("-mx-1 h-px bg-outline-variant/15", className)}
    {...props}
  />
));
CommandSeparator.displayName = CommandSeparatorPrimitive.displayName;

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandItemPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandItemPrimitive>
>(({ className, ...props }, ref) => (
  <CommandItemPrimitive
    ref={ref}
    className={cn(
      "relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-surface-highest data-[selected=true]:text-on-surface data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      className,
    )}
    {...props}
  />
));

CommandItem.displayName = CommandItemPrimitive.displayName;

const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-on-surface-variant",
        className,
      )}
      {...props}
    />
  );
};
CommandShortcut.displayName = "CommandShortcut";

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};
