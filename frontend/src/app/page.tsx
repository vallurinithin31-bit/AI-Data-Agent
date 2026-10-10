'use client';

import React, { useState, useEffect } from 'react';
import { DatasetMetadata } from '@/types';
import { fetchDatasets, deleteDataset } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import DashboardView from '@/components/DashboardView';
import DatasetsView from '@/components/DatasetsView';
import CleaningStudioView from '@/components/CleaningStudioView';
import AiChatView from '@/components/AiChatView';
import FunnelView from '@/components/FunnelView';
import CohortView from '@/components/CohortView';
import SegmentationView from '@/components/SegmentationView';
import ForecastingView from '@/components/ForecastingView';
import AnomaliesView from '@/components/AnomaliesView';
import ReportsView from '@/components/ReportsView';
import SettingsView from '@/components/SettingsView';
import CustomExportView from '@/components/CustomExportView';
import DataGenerationAgentView from '@/components/DataGenerationAgentView';
import { RefreshCw, AlertCircle } from 'lucide-react';

export default function Home() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [datasets, setDatasets] = useState<DatasetMetadata[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<DatasetMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  const loadData = () => {
    setLoading(true);
    setConnectionError(false);
    fetchDatasets()
      .then((data) => {
        setDatasets(data);
        if (data.length > 0 && !selectedDataset) {
          setSelectedDataset(data[0]);
        }
      })
      .catch((err) => {
        console.error('Failed to load datasets:', err);
        setConnectionError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDatasetUploaded = (newMeta: DatasetMetadata) => {
    setDatasets(prev => [newMeta, ...prev]);
    setSelectedDataset(newMeta);
    setCurrentTab('datasets');
  };

  const handleDatasetUpdated = (cleanMeta: DatasetMetadata) => {
    setDatasets(prev => [cleanMeta, ...prev]);
    setSelectedDataset(cleanMeta);
    setCurrentTab('dashboard');
  };

  const handleDatasetCreated = (newMeta: DatasetMetadata) => {
    setDatasets(prev => {
      const exists = prev.some(d => d.id === newMeta.id);
      return exists ? prev : [newMeta, ...prev];
    });
    setSelectedDataset(newMeta);
  };

  const handleDatasetDeleted = async (datasetId: string) => {
    try {
      await deleteDataset(datasetId);
      setDatasets(prev => {
        const remaining = prev.filter(d => d.id !== datasetId);
        if (selectedDataset?.id === datasetId) {
          setSelectedDataset(remaining.length > 0 ? remaining[0] : null);
        }
        return remaining;
      });
    } catch (err) {
      console.error('Failed to delete dataset:', err);
    }
  };

  const renderActiveView = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardView dataset={selectedDataset} onNavigateTab={setCurrentTab} />;
      case 'data-generation':
        return (
          <DataGenerationAgentView
            currentDataset={selectedDataset}
            datasets={datasets}
            onDatasetCreated={handleDatasetCreated}
            onSelectDataset={setSelectedDataset}
          />
        );
      case 'custom-export':
        return (
          <CustomExportView
            dataset={selectedDataset}
            datasets={datasets}
            onSelectDataset={setSelectedDataset}
          />
        );
      case 'datasets':
        return (
          <DatasetsView
            dataset={selectedDataset}
            onDatasetUploaded={handleDatasetUploaded}
            onDeleteDataset={handleDatasetDeleted}
          />
        );
      case 'cleaning':
        return <CleaningStudioView dataset={selectedDataset} onDatasetUpdated={handleDatasetUpdated} />;
      case 'chat':
        return <AiChatView dataset={selectedDataset} />;
      case 'funnel':
        return <FunnelView dataset={selectedDataset} />;
      case 'cohort':
        return <CohortView dataset={selectedDataset} />;
      case 'segmentation':
        return <SegmentationView dataset={selectedDataset} />;
      case 'forecasting':
        return <ForecastingView dataset={selectedDataset} />;
      case 'anomalies':
        return <AnomaliesView dataset={selectedDataset} />;
      case 'reports':
        return <ReportsView dataset={selectedDataset} />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView dataset={selectedDataset} onNavigateTab={setCurrentTab} />;
    }
  };

  if (loading && datasets.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white text-black">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-600 font-medium">Initializing AI Data Analyst Agent Platform...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white text-black">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        datasets={datasets}
        selectedDataset={selectedDataset}
        onSelectDataset={setSelectedDataset}
        onDeleteDataset={handleDatasetDeleted}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-white">
        {connectionError && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Backend service is warming up or unreachable. Please verify your backend connection.</span>
            </div>
            <button
              onClick={loadData}
              className="px-3 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 font-semibold transition-colors flex items-center gap-1 border border-amber-300"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}

        <div className="max-w-7xl mx-auto">
          {renderActiveView()}
        </div>
      </main>
    </div>
  );
}
