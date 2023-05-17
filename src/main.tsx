import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { ReactRouter6Adapter } from 'use-query-params/adapters/react-router-6';
import { Loader } from '@mantine/core'
import { QueryParamProvider } from 'use-query-params'

const router = createBrowserRouter([
  {
    path: "/ec2-lambda-cost/",
    element: <QueryParamProvider adapter={ReactRouter6Adapter}><App /></QueryParamProvider>,
    loader: () => <Loader />,
    children: [],
  },
]);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
