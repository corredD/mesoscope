import { Theme } from '@radix-ui/themes'
import { AppShell } from '../components/layout/AppShell'
import { useThemeStore } from '../state/themeStore'

function App() {
  const theme = useThemeStore((state) => state.theme)

  return (
    <Theme
      appearance={theme}
      accentColor="blue"
      grayColor="slate"
      panelBackground="solid"
      radius="medium"
      scaling="90%"
      hasBackground={false}
      className="mesoscope-theme"
    >
      <AppShell />
    </Theme>
  )
}

export default App
