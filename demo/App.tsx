import { useState } from 'react';
import ConfigProvider from '@/ConfigProvider';
import './App.css';
import DemoDataProvider from './DemoDataProvider';
import DemoResource from './DemoResource';

function App() {
  const [dataProvider] = useState(() => new DemoDataProvider('demo'));

  return (
    <ConfigProvider dataProvider={dataProvider}>
      <DemoResource />
    </ConfigProvider>
  );
}

export default App;
