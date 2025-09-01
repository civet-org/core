import { useState } from 'react';
import ConfigProvider from '@/ConfigProvider';
import './App.css';
import DemoDataProvider from './DemoDataProvider';
import DemoResource from './DemoResource';

export default function App() {
  const [dataProvider] = useState(() => new DemoDataProvider('demo'));

  return (
    <ConfigProvider dataProvider={dataProvider}>
      <DemoResource />
    </ConfigProvider>
  );
}
