import SlotHeaderCenter from "../slot-header-center";
import SlotHeaderLeft from "../slot-header-left";
import SlotHeaderRight from "../slot-header-right";
import { headerHeight } from "./config";
import classes from "./Header.module.css";
import HeaderMobileMenu from "./HeaderMobileMenu";

export function Header() {
  return (
    <header className={classes.header} style={{ height: headerHeight }}>
      <div className={"mx-auto max-w-screen-md h-full px-4"}>
        <div className="flex h-full w-full items-center justify-between">
          <SlotHeaderLeft />
          <div className="hidden md:block">
            <SlotHeaderCenter />
          </div>
          <div className="hidden md:block">
            <SlotHeaderRight />
          </div>
          <div className="block md:hidden">
            <HeaderMobileMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
