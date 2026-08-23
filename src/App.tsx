
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import ViewPhoto from './pages/ViewPhoto';
import Admin from './pages/Admin';
import Services from './pages/Services';
import Cart from './pages/Cart';
import LookupOrder from './pages/LookupOrder';
import PaymentConfirmation from './pages/PaymentConfirmation';
import PrintDocument from './pages/PrintDocument';
import PrintMobileUpload from './pages/PrintMobileUpload';

function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/view/:id" element={<ViewPhoto />} />
          <Route path="/services" element={<Services />} />
          <Route path="/print" element={<PrintDocument />} />
          <Route path="/print-upload/:sessionId" element={<PrintMobileUpload />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/lookup" element={<LookupOrder />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/confirm-payment/:type/:id" element={<PaymentConfirmation />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default App;
