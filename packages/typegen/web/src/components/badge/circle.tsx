import { Badge } from "@/components/ui/badge";

export default function Component() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        <Badge shape="circle" variant="primary">
          Primary
        </Badge>
        <Badge shape="circle" variant="success">
          Success
        </Badge>
        <Badge shape="circle" variant="warning">
          Warning
        </Badge>
        <Badge shape="circle" variant="info">
          Info
        </Badge>
        <Badge shape="circle" variant="destructive">
          Destructive
        </Badge>
      </div>
      <div className="flex items-center gap-4">
        <Badge appearance="light" shape="circle" variant="primary">
          Primary
        </Badge>
        <Badge appearance="light" shape="circle" variant="success">
          Success
        </Badge>
        <Badge appearance="light" shape="circle" variant="warning">
          Warning
        </Badge>
        <Badge appearance="light" shape="circle" variant="info">
          Info
        </Badge>
        <Badge appearance="light" shape="circle" variant="destructive">
          Destructive
        </Badge>
      </div>
      <div className="flex items-center gap-4">
        <Badge appearance="outline" shape="circle" variant="primary">
          Primary
        </Badge>
        <Badge appearance="outline" shape="circle" variant="success">
          Success
        </Badge>
        <Badge appearance="outline" shape="circle" variant="warning">
          Warning
        </Badge>
        <Badge appearance="outline" shape="circle" variant="info">
          Info
        </Badge>
        <Badge appearance="outline" shape="circle" variant="destructive">
          Destructive
        </Badge>
      </div>
    </div>
  );
}
