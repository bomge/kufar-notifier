import "@mantine/core/styles.css";
import { AppShell, Box, Container, MantineProvider, Text } from "@mantine/core";
import { theme } from "./theme";
import ConfigEditor from "./components/ConfigEditor";
import { Notifications } from '@mantine/notifications';

export default function App() {


  return <MantineProvider defaultColorScheme="light" forceColorScheme="light">
    <AppShell
      padding="md"
      header={
        { height: 60 }
      }
    >
      {/* <AppShell.Header> */}
      {/* <Text size="xl">Config Editor</Text> */}
      {/* </AppShell.Header> */}
      <Box bg='gray.0' mih='100vh'>
      <Notifications position="bottom-right" zIndex={99999999} />
        
      <Container>
        <ConfigEditor />
      </Container>
      </Box>
    </AppShell>
  </MantineProvider>;
}
