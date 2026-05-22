import { Avatar } from "native-base";
import React, { ComponentProps } from "react";

type AvartarProps = ComponentProps<typeof Avatar> & {
  name?: string;
  imageUrl?: string;
  size?:
    | number
    | "2xs"
    | "xs"
    | "sm"
    | "md"
    | "lg"
    | "xl"
    | "2xl"
    | "3xl"
    | "4xl"
    | "5xl";
};

export const Avartar: React.FC<AvartarProps> = ({
  name,
  imageUrl,
  size = "md",
  children,
  ...props
}) => {
  const fallbackText = name
    ? name.charAt(0).toUpperCase() + name.charAt(1).toLowerCase()
    : "Ku";

  // ถ้า size เป็น number ใช้ fontSize ครึ่งหนึ่ง
  // ถ้าเป็น string ให้ใช้ค่า default ของ NativeBase
  const _text = typeof size === "number" ? { fontSize: size / 2 } : undefined;

  return (
    <Avatar
      source={imageUrl ? { uri: imageUrl } : undefined}
      size={size as any} // NativeBase ยังรับ string หรือ number
      {...props}
      _text={_text}
    >
      {children ?? fallbackText}
    </Avatar>
  );
};
