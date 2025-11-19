import Home from './pages/Home';
import Services from './pages/Services';
import Gallery from './pages/Gallery';
import Contact from './pages/Contact';
import ClientManagement from './pages/ClientManagement';
import SatisfactionSurvey from './pages/SatisfactionSurvey';
import EmployeeDashboard from './pages/EmployeeDashboard';
import Welcome from './pages/Welcome';
import Careers from './pages/Careers';
import Sitemap from './pages/Sitemap';
import PrivacyPolicy from './pages/PrivacyPolicy';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Services": Services,
    "Gallery": Gallery,
    "Contact": Contact,
    "ClientManagement": ClientManagement,
    "SatisfactionSurvey": SatisfactionSurvey,
    "EmployeeDashboard": EmployeeDashboard,
    "Welcome": Welcome,
    "Careers": Careers,
    "Sitemap": Sitemap,
    "PrivacyPolicy": PrivacyPolicy,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};