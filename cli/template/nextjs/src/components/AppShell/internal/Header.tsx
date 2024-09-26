import { Container, Group, Box } from "@mantine/core";
import classes from "./Header.module.css";
import SlotHeaderLeft from "../slot-header-left";
import SlotHeaderCenter from "../slot-header-center";
import SlotHeaderRight from "../slot-header-right";
import HeaderMobileMenu from "./HeaderMobileMenu";
import { headerHeight } from "./config";

export function Header() {
  return (
    <header className={classes.header} style={{ height: headerHeight }}>
      <Container size="md" className={classes.inner} style={{ height: "100%" }}>
        <Group
          justify="space-between"
          align="center"
          w="100%"
          style={{ height: "100%" }}
        >
          <SlotHeaderLeft />
          <Box visibleFrom="md">
            <SlotHeaderCenter />
          </Box>
          <Box visibleFrom="md">
            <SlotHeaderRight />
          </Box>
          <Box hiddenFrom="md">
            <HeaderMobileMenu />
          </Box>
        </Group>
      </Container>
    </header>
  );
}
