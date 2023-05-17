import './App.css'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { calculateLambdaCost, calculateLambdaInvocations } from './Calculator';
import { Input, MantineProvider, Slider, Stack, Table, Grid, Autocomplete, Card, ThemeIcon, ColorScheme } from '@mantine/core';
import { MantineThemeOverride } from "@mantine/core";
import { ec2InstanceTypes } from './EC2Costs';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { useColorScheme, useDebouncedValue, useHotkeys, useLocalStorage } from '@mantine/hooks';
import { NumberParam, StringParam, useQueryParams, withDefault } from 'use-query-params';
import { useState } from 'react';

const KILO = 1024;
const HOURS_PER_DAY = 24;
const LIMIT_EC2_INSTANCE_TYPES = 50;

const theme: MantineThemeOverride = {
  colorScheme: "dark",
};

const lightTheme: MantineThemeOverride = {
  colorScheme: "light",
};

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const options: ChartOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top' as const,
    },
    title: {
      display: true,
      text: 'EC2 vs Lambda Cost per day (USD)',
    },
  },
};

const entries = new Set(Object.entries(ec2InstanceTypes).map(([key]) => {
  return key.split('.')[0];
}).sort((a: string, b: string) => a.localeCompare(b)));

function App() {
  const preferredColorScheme = useColorScheme();
  const [colorScheme, setColorScheme] = useLocalStorage<ColorScheme>({
    key: 'mantine-color-scheme',
    defaultValue: preferredColorScheme,
    getInitialValueInEffect: false,
  });
  
  const FilterParam = withDefault(StringParam, 't2');
  const MemorySizeMbParam = withDefault(NumberParam, 128);
  const ComputeTimeMsParam = withDefault(NumberParam, 200);
  const StorageMb = withDefault(NumberParam, 512);
  const NumInstancesParam = withDefault(NumberParam, 1);

  const [query, setQuery] = useQueryParams({
    filter: FilterParam,
    memorySizeMb: MemorySizeMbParam,
    computeTimeMs: ComputeTimeMsParam,
    storageMb: StorageMb,
    numInstances: NumInstancesParam,
  });

  const [filter, setFilter] = useState( query.filter);
  const [memorySizeMb, setMemorySizeMb] = useState(query.memorySizeMb);
  const [computeTimeMs, setComputeTimeMs] = useState(query.computeTimeMs);
  const [storageMb, setStorageMb] = useState(query.storageMb);
  const [numInstances, setNumInstances] = useState(query.numInstances);

  useDebouncedValue(() => {
    setQuery({
      filter,
      memorySizeMb,
      computeTimeMs,
      storageMb,
      numInstances,
    });
  }, 200);

  const toggleColorScheme = (value?: ColorScheme) =>
    setColorScheme(value || (colorScheme === 'dark' ? 'light' : 'dark'));

  useHotkeys([['mod+J', () => toggleColorScheme()]]);

  const filteredEc2InstanceTypes = Object.entries(ec2InstanceTypes).filter(([key]) => {
    try {
      const regex = new RegExp(filter, 'i');
      return regex.test(key)
    } catch (e) {
      return true;
    }
  }).slice(0, LIMIT_EC2_INSTANCE_TYPES);

  const onFilterChange = (value: string) => {
    setFilter(value);
  }

  const maxCost = Math.max(...filteredEc2InstanceTypes.map(([, value]) => Number(value)));
  const maxDailyCost = maxCost * HOURS_PER_DAY * numInstances;

  const { invocations } = calculateLambdaInvocations({
    totalCost: maxDailyCost,
    computeTimeMs: computeTimeMs,
    memorySizeGB: memorySizeMb / KILO,
    ephemeralStorageGB: storageMb / KILO,
  });

  const numSteps = Math.max(1, Math.min(10, invocations));
  const stepSize = Math.max(invocations, 0) / numSteps;
  const labels = Array.from(Array(numSteps + 1).keys()).map((_, index) => Math.round(index * stepSize));
  const datasets = filteredEc2InstanceTypes.map(([key, value]) => ({
    label: key,
    data: labels.map(() => Number(value) * HOURS_PER_DAY * numInstances),
    borderColor: `rgb(${Number(value) / maxCost * 255}, 99, 132)`,
    backgroundColor: `rgba(${Number(value) / maxCost * 255}, 99, 132, 0.5)`,
  }));

  const lambdaData = labels.map((label) => calculateLambdaCost({
    requests: label,
    computeTimeMs: computeTimeMs,
    memorySizeGB: memorySizeMb / KILO,
    ephemeralStorageGB: storageMb / KILO,
  }).totalCost)

  datasets.push({
    label: 'Lambda',
    data: lambdaData,
    borderColor: 'rgb(99, 255, 132)',
    backgroundColor: 'rgba(99, 255, 132, 0.5)',
  });

  const data: ChartData<'line'> = { labels, datasets };

  const marks = [
    { value: 128 },
    { value: 256 },
    { value: 512 },
    { value: 1024 },
    { value: 2048 },
    { value: 4096 },
    { value: 8192 },
    { value: 10240 },
  ];

  function valueLabelFormat(value: number) {
    const units = ['MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    let unitIndex = 0;
    let scaledValue = value;

    while (scaledValue >= KILO && unitIndex < units.length - 1) {
      unitIndex += 1;
      scaledValue /= KILO;
    }

    return `${scaledValue} ${units[unitIndex]}`;
  }

  function timeLabelFormat(value: number) {
    if (value < 1000) {
      return `${value} ms`;
    }
    if (value > 60 * 1000) {
      const seconds = value / 1000;
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds - minutes * 60);
      return `${minutes} min ${remainingSeconds} s`
    }
    return `${value / 1000} s`;
  }

  console.log('colorScheme', colorScheme);

  return (
    <MantineProvider theme={colorScheme === 'light' ? lightTheme : theme} withGlobalStyles withNormalizeCSS>
      <ThemeIcon 
        variant="outline"
        className='theme-icon'
          onClick={() => toggleColorScheme()}>
          {colorScheme === 'light' ? <IconMoon /> : <IconSun />}
      </ThemeIcon>
      <Grid grow>


      <Grid.Col lg={12}>
        <Stack p="xl">
          <h1>EC2 vs Lambda cost calculator</h1>
          <Card>
            <p>Compare cost effectiveness between lambda and EC2 based on resource requirements.</p>
            <p>The table and graph below show how many lambda invocations would be needed before lambda becomes less efficient than EC2</p>
          </Card>
        </Stack>
      </Grid.Col>


      <Grid.Col lg={6}>
          <Stack spacing="xl" p="xl">
            <h3>Lambda configuration</h3>
            <div>
              <label>Memory (MB)</label>
              <Slider
                min={128} max={10240}
                step={128}
                labelAlwaysOn
                label={valueLabelFormat}
                marks={marks}
                value={memorySizeMb}
                onChange={(value) => setMemorySizeMb(value)}
              />
              <Input max={10240} value={memorySizeMb} onChange={(event) => setMemorySizeMb(parseInt(event.target.value) || 0)} />
            </div>

            <div>
              <label>Storage (MB)</label>
              <Slider
                step={128} min={512} 
                max={10_240}
                labelAlwaysOn
                label={valueLabelFormat}
                marks={marks}
                value={storageMb}
                onChange={(event) => setStorageMb(Number(event))}
              />
              <Input value={storageMb} onChange={(event) => setStorageMb(Number(event.target.value))} />
            </div>

            <div>
              <label>Average duration (ms)</label>
              <Slider
                step={100} min={100} 
                max={15 * 60 * 1000}
                labelAlwaysOn
                label={timeLabelFormat}
                value={computeTimeMs}
                onChange={(event) => setComputeTimeMs(Number(event))}
              />
              <Input value={computeTimeMs} onChange={(event) => setComputeTimeMs(Number(event.target.value))} />
            </div>  
          </Stack>
        </Grid.Col>



        <Grid.Col lg={6}>
          <Stack p="xl">
            <h3>EC2 configuration</h3>
            <Grid.Col md={6}>
            <label>Filter by instance type (regex enabled)</label>
            <Autocomplete
              placeholder={filter}
              value={filter}
              onChange={onFilterChange}
              data={Array.from(entries).map((value) => value)}
            />
            </Grid.Col>
            <Grid.Col md={6}>
              <label>Number of instances</label>
              <Input min={0} type='number' value={numInstances} onChange={(event) => setNumInstances(Number(event.target.value))} />
            </Grid.Col>
          </Stack>
            
        </Grid.Col>

        {filteredEc2InstanceTypes.length > 0 ? (
          <Grid.Col lg={8}>
            <Table>
              <thead>
                <tr>
                  <th>Instance Type</th>
                  <th>Daily cost</th>
                  <th>Monthly cost</th>
                  <th>Daily lambda invocation equivalent</th>
                </tr>
              </thead>
              <tbody>
                {filteredEc2InstanceTypes.sort((a, b) => Number(a[1]) - Number(b[1]))
                  .map(([key, value]) => {
                  const cost = (Number(value) * HOURS_PER_DAY * numInstances);
                  const { invocations } = calculateLambdaInvocations({
                    totalCost: Number(cost),
                    computeTimeMs: computeTimeMs,
                    memorySizeGB: memorySizeMb / KILO,
                    ephemeralStorageGB: storageMb / KILO,
                  });
                  return (
                    <tr key={key}>
                      <td>{key}</td>
                      <td>${cost.toLocaleString()}</td>
                      <td>${((Number(cost) * 365) / 12).toLocaleString()}</td>
                      <td>{invocations.toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          </Grid.Col>
        ) : (
          <Grid.Col lg={8}>
            <h3>No results</h3>
          </Grid.Col>
        )}

      </Grid>

      <div className="chart-container" style={{ position: 'relative', height:'100vh', maxWidth: '1280px', width:'90vw' }}>
        <Line data={data} options={options} />
      </div>
    </MantineProvider>
  )
}

export default App
