"""
Qplix Public API Client - Comprehensive Example
Complete API wrapper with all endpoints and fields from the Qplix Public API
"""

import requests
import json
from datetime import datetime
from typing import Optional, List, Dict, Any


class QplixAPIClient:
    """Qplix Public API Client with all available endpoints"""
    
    def __init__(self, base_url: str, f5_bearer: str = "", username: str = "", password: str = ""):
        self.base_url = base_url.rstrip('/')
        self.f5_bearer = f5_bearer
        self.username = username
        self.password = password
        self.q_bearer = None
        self.headers = {}
        
    def authenticate(self) -> str:
        """Authenticate and obtain bearer token"""
        token_url = f"{self.base_url}/Token"
        body = f"grant_type=password&username={self.username}&password={self.password}"
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        
        if self.f5_bearer:
            headers["Authorization"] = f"Bearer {self.f5_bearer}"
            
        response = requests.post(token_url, headers=headers, data=body)
        response.raise_for_status()
        response_data = response.json()
        self.q_bearer = response_data['access_token']
        
        # Assemble combined Bearer Header
        self.headers = {
            "Authorization": f"Bearer {self.q_bearer}",
            "Content-Type": "application/json",
        }
        if self.f5_bearer:
            self.headers["Authorization"] = f"Bearer {self.f5_bearer}, Bearer {self.q_bearer}"
            
        return self.q_bearer
    
    def _request(self, method: str, endpoint: str, params: Dict = None, data: Dict = None) -> Dict:
        """Make authenticated API request"""
        url = f"{self.base_url}{endpoint}"
        response = requests.request(
            method=method,
            url=url,
            headers=self.headers,
            params=params,
            json=data
        )
        response.raise_for_status()
        return response.json() if response.text else {}

    # ==================== ACTIVITIES ====================
    
    def get_activities(
        self,
        from_date: Optional[str] = None,
        until_date: Optional[str] = None,
        business_object_type: Optional[List[str]] = None,
        business_object_id: Optional[str] = None,
        business_object_ids: Optional[List[str]] = None,
        labels: Optional[List[str]] = None,
        skip: Optional[int] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """
        Get activities.
        
        Args:
            from_date: Exclude all activities earlier to this date (ISO format)
            until_date: Exclude all activities prior to this date (ISO format)
            business_object_type: The type of the activity related business object
            business_object_id: Only show activities for the specified object id
            business_object_ids: List of business object IDs
            labels: Only include activities that have a specific label assigned
            skip: Number of results to skip
            limit: Number of results to return
        """
        params = {}
        if from_date:
            params['From'] = from_date
        if until_date:
            params['Until'] = until_date
        if business_object_type:
            params['BusinessObjectType'] = business_object_type
        if business_object_id:
            params['BusinessObjectId'] = business_object_id
        if business_object_ids:
            params['BusinessObjectIds'] = business_object_ids
        if labels:
            params['Labels'] = labels
        if skip is not None:
            params['Skip'] = skip
        if limit is not None:
            params['Limit'] = limit
            
        return self._request('GET', '/qapi/v1/activities', params=params)

    def get_legal_entity_buy_sell_activities(self, entity_id: str, from_date: Optional[str] = None, until_date: Optional[str] = None, skip: Optional[int] = None, limit: Optional[int] = None) -> Dict:
        """
        Get all buy and sell activities for a legal entity, including what was bought/sold and when.
        Args:
            entity_id: The legal entity id
            from_date: Exclude all activities earlier to this date (ISO format)
            until_date: Exclude all activities prior to this date (ISO format)
            skip: Number of results to skip
            limit: Number of results to return
        Returns:
            Dict: Activities data
        """
        return self.get_activities(
            from_date=from_date,
            until_date=until_date,
            business_object_type=None,
            business_object_id=entity_id,
            labels=None,
            skip=skip,
            limit=limit
        )

    def get_legal_entity_buy_sell_asset_activities(self, legal_entity_id: str, from_date: Optional[str] = None, until_date: Optional[str] = None, skip: Optional[int] = None, limit: Optional[int] = None) -> Dict:
        """Get all Buy and Sell activities for a legal entity across all assets."""
        params = {'legalEntityId': legal_entity_id, 'types': ['Buy', 'Sell']}
        if from_date:
            params['From'] = from_date
        if until_date:
            params['Until'] = until_date
        if skip is not None:
            params['Skip'] = skip
        if limit is not None:
            params['Limit'] = limit
        return self._request('GET', '/qapi/v1/activities', params=params)

    # ==================== EVALUATION ====================
    
    def get_evaluation_config(
        self,
        config_id: str,
        skip: Optional[int] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """Get evaluation configuration"""
        params = {}
        if skip is not None:
            params['Skip'] = skip
        if limit is not None:
            params['Limit'] = limit
        return self._request('GET', f'/qapi/v1/evaluation/{config_id}', params=params)
    
    def get_client_evaluation_info(
        self,
        config_id: str,
        evaluation_id: str,
        client_id: str
    ) -> Dict:
        """
        Get system evaluation for a client.
        
        Args:
            config_id: The evaluation configuration
            evaluation_id: The evaluation id. Can be "last" or "today"
            client_id: The client id
        """
        return self._request(
            'GET', 
            f'/qapi/v1/evaluation/{config_id}/results/{evaluation_id}/client/{client_id}'
        )
    
    def get_client_evaluation_lines(
        self,
        config_id: str,
        evaluation_id: str,
        client_id: str,
        skip: Optional[int] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """Get client evaluation lines"""
        params = {}
        if skip is not None:
            params['Skip'] = skip
        if limit is not None:
            params['Limit'] = limit
        return self._request(
            'GET',
            f'/qapi/v1/evaluation/{config_id}/results/{evaluation_id}/client/{client_id}/lines',
            params=params
        )
    
    def get_evaluation_lines(
        self,
        config_id: str,
        request_params: Dict,
        skip: Optional[int] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """
        Get the column headers and the first level lines for the requested configuration.
        
        Args:
            config_id: The evaluation configuration id
            request_params: Request parameters body
            skip: Number of results to skip
            limit: Number of results to return
        """
        params = {}
        if skip is not None:
            params['Skip'] = skip
        if limit is not None:
            params['Limit'] = limit
        return self._request(
            'POST',
            f'/qapi/v1/evaluation/{config_id}/results/lines',
            params=params,
            data=request_params
        )
    
    def recalculate_client_evaluation(
        self,
        config_id: str,
        request_body: Optional[Dict] = None
    ) -> Dict:
        """
        Recalculate system evaluation for all clients or a selection.
        Returns a job info that can be queried to check completion.
        """
        return self._request(
            'POST',
            f'/qapi/v1/evaluation/{config_id}/recalculate',
            data=request_body or {}
        )
    
    def get_evaluation_preset_legal_entity(
        self,
        preset_id: str,
        legal_entity_id: str,
        group_id: Optional[str] = None,
        respect_hide: Optional[bool] = None,
        interval: Optional[str] = None,
        start_date: Optional[str] = None,
        analytic_start_provider_id: Optional[str] = None,
        entry_type: Optional[str] = None,
        due_date: Optional[str] = None
    ) -> Dict:
        """
        Get legal entity query results for predefined preset.
        
        Args:
            preset_id: The id of the preset with the query description
            legal_entity_id: The legal entity id
            group_id: Optional group identifier
            respect_hide: Whether to respect hide settings
            interval: Optional default interval (affects versioned data/metrics)
            start_date: Optional default start date
            analytic_start_provider_id: Source of analytics start date
            entry_type: Default entry type (default is "Unmatched")
            due_date: Default date for versioned data (format: YYYY-MM-dd)
        """
        params = {}
        if group_id:
            params['GroupId'] = group_id
        if respect_hide is not None:
            params['RespectHide'] = respect_hide
        if interval:
            params['Interval'] = interval
        if start_date:
            params['StartDate'] = start_date
        if analytic_start_provider_id:
            params['AnalyticStartProviderId'] = analytic_start_provider_id
        if entry_type:
            params['EntryType'] = entry_type
        if due_date:
            params['DueDate'] = due_date
            
        return self._request(
            'GET',
            f'/qapi/v1/evaluation/preset/{preset_id}/legalEntity/{legal_entity_id}',
            params=params
        )

    # ==================== BENCHMARKS ====================
    
    def get_benchmarks(
        self,
        skip: Optional[int] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """Get benchmarks matching search criteria"""
        params = {}
        if skip is not None:
            params['Skip'] = skip
        if limit is not None:
            params['Limit'] = limit
        return self._request('GET', '/qapi/v1/benchmarks', params=params)
    
    def get_benchmark(self, benchmark_id: str) -> Dict:
        """Get benchmark details by ID"""
        return self._request('GET', f'/qapi/v1/benchmarks/{benchmark_id}')

    # ==================== CLASSIFICATIONS ====================
    
    def get_classification_root(self) -> Dict:
        """Get the root classification"""
        return self._request('GET', '/qapi/v1/classifications/root')
    
    def get_classification_root_sub_classifications(self) -> Dict:
        """Get sub classifications of the root classification"""
        return self._request('GET', '/qapi/v1/classifications/root/subClassifications')
    
    def get_classification_root_benchmarks(self) -> Dict:
        """Get the root classification's benchmarks"""
        return self._request('GET', '/qapi/v1/classifications/root/benchmarks')
    
    def add_classification_root_benchmark(self, benchmark_data: Dict) -> Dict:
        """Add benchmark to the root classification"""
        return self._request('POST', '/qapi/v1/classifications/root/benchmarks', data=benchmark_data)
    
    def remove_classification_root_benchmark(self, benchmark_id: str) -> Dict:
        """Remove benchmark from the root classification"""
        return self._request('DELETE', f'/qapi/v1/classifications/root/benchmarks/{benchmark_id}')
    
    def get_classification(self, classification_id: str) -> Dict:
        """Get classification by ID"""
        return self._request('GET', f'/qapi/v1/classifications/{classification_id}')
    
    def get_sub_classifications(self, classification_id: str) -> Dict:
        """Get sub classifications of a classification"""
        return self._request('GET', f'/qapi/v1/classifications/{classification_id}/subClassifications')
    
    def get_classification_benchmarks(self, classification_id: str) -> Dict:
        """Get benchmarks for a classification"""
        return self._request('GET', f'/qapi/v1/classifications/{classification_id}/benchmarks')
    
    def add_classification_benchmark(self, classification_id: str, benchmark_data: Dict) -> Dict:
        """Add benchmark to classification"""
        return self._request('POST', f'/qapi/v1/classifications/{classification_id}/benchmarks', data=benchmark_data)
    
    def remove_classification_benchmark(self, classification_id: str, benchmark_id: str) -> Dict:
        """Remove benchmark from classification"""
        return self._request('DELETE', f'/qapi/v1/classifications/{classification_id}/benchmarks/{benchmark_id}')

    # ==================== COMMON PROPERTIES ====================
    
    def get_common_properties(self, entity_id: str) -> Dict:
        """Get common properties for an entity"""
        return self._request('GET', f'/qapi/v1/commonProperties/{entity_id}')
    
    def update_common_properties(self, entity_id: str, properties_data: Dict) -> Dict:
        """Update common properties for an entity"""
        return self._request('PUT', f'/qapi/v1/commonProperties/{entity_id}', data=properties_data)
    
    def get_common_property(self, entity_id: str, property_id: str) -> Dict:
        """Get a specific common property"""
        return self._request('GET', f'/qapi/v1/commonProperties/{entity_id}/{property_id}')
    
    def create_common_property(self, entity_id: str, property_id: str, property_data: Dict) -> Dict:
        """Create a common property"""
        return self._request('POST', f'/qapi/v1/commonProperties/{entity_id}/{property_id}', data=property_data)
    
    def update_common_property(self, entity_id: str, property_id: str, property_data: Dict) -> Dict:
        """Update a common property"""
        return self._request('PUT', f'/qapi/v1/commonProperties/{entity_id}/{property_id}', data=property_data)
    
    def delete_common_property(self, entity_id: str, property_id: str) -> Dict:
        """Delete a common property"""
        return self._request('DELETE', f'/qapi/v1/commonProperties/{entity_id}/{property_id}')

    # ==================== INVESTMENTS ====================
    
    def get_investments(
        self,
        skip: Optional[int] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """Get investments matching search criteria"""
        params = {}
        if skip is not None:
            params['Skip'] = skip
        if limit is not None:
            params['Limit'] = limit
        return self._request('GET', '/qapi/v1/investments', params=params)
    
    def get_investment(self, investment_id: str) -> Dict:
        """Get investment details"""
        return self._request('GET', f'/qapi/v1/investments/{investment_id}')
    
    def get_investment_benchmarks(self, investment_id: str) -> Dict:
        """Get investment benchmarks"""
        return self._request('GET', f'/qapi/v1/investments/{investment_id}/benchmarks')
    
    def add_investment_benchmark(self, investment_id: str, benchmark_data: Dict) -> Dict:
        """Add benchmark to investment"""
        return self._request('POST', f'/qapi/v1/investments/{investment_id}/benchmarks', data=benchmark_data)
    
    def remove_investment_benchmark(self, investment_id: str, benchmark_id: str) -> Dict:
        """Remove benchmark from investment"""
        return self._request('DELETE', f'/qapi/v1/investments/{investment_id}/benchmarks/{benchmark_id}')
    
    def get_investment_query_results(
        self,
        investment_id: str,
        preset_id: str,
        interval: Optional[str] = None,
        start_date: Optional[str] = None,
        analytic_start_provider_id: Optional[str] = None,
        entry_type: Optional[str] = None,
        due_date: Optional[str] = None
    ) -> Dict:
        """Get investment query results for predefined preset"""
        params = {}
        if interval:
            params['Interval'] = interval
        if start_date:
            params['StartDate'] = start_date
        if analytic_start_provider_id:
            params['AnalyticStartProviderId'] = analytic_start_provider_id
        if entry_type:
            params['EntryType'] = entry_type
        if due_date:
            params['DueDate'] = due_date
        return self._request('GET', f'/qapi/v1/investments/{investment_id}/queryResults/{preset_id}', params=params)
    
    def get_investment_document_links(
        self,
        investment_id: str,
        skip: Optional[int] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """Get investment document links"""
        params = {}
        if skip is not None:
            params['Skip'] = skip
        if limit is not None:
            params['Limit'] = limit
        return self._request('GET', f'/qapi/v1/investments/{investment_id}/documentLinks', params=params)
    
    def set_investment_document_link(
        self,
        investment_id: str,
        document_id: Optional[str] = None,
        path: Optional[str] = None
    ) -> Dict:
        """Set document link for investment"""
        params = {}
        if document_id:
            params['DocumentId'] = document_id
        if path:
            params['Path'] = path
        return self._request('POST', f'/qapi/v1/investments/{investment_id}/documentLinks', params=params)
    
    def get_investment_document_tree(
        self,
        investment_id: str,
        skip: Optional[int] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """Get investment document tree"""
        params = {}
        if skip is not None:
            params['Skip'] = skip
        if limit is not None:
            params['Limit'] = limit
        return self._request('GET', f'/qapi/v1/investments/{investment_id}/documentTree', params=params)
    
    def get_investment_document_subtree(
        self,
        investment_id: str,
        path: str,
        skip: Optional[int] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """Get investment document subtree"""
        params = {}
        if skip is not None:
            params['Skip'] = skip
        if limit is not None:
            params['Limit'] = limit
        return self._request('GET', f'/qapi/v1/investments/{investment_id}/documentTree/{path}', params=params)
    
    def get_investment_transaction_query_results(
        self,
        investment_id: str,
        preset_id: str,
        client_group_id: Optional[str] = None,
        from_date: Optional[str] = None,
        entry_type: Optional[str] = None,
        due_date: Optional[str] = None
    ) -> Dict:
        """Get transaction query results for investment"""
        params = {}
        if client_group_id:
            params['ClientGroupId'] = client_group_id
        if from_date:
            params['From'] = from_date
        if entry_type:
            params['EntryType'] = entry_type
        if due_date:
            params['DueDate'] = due_date
        return self._request('GET', f'/qapi/v1/investments/{investment_id}/transactionQueryResults/{preset_id}', params=params)

    # ==================== JOBS ====================
    
    def get_job(self, job_id: str) -> Dict:
        """Get job details"""
        return self._request('GET', f'/qapi/v1/jobs/{job_id}')
    
    def get_paginated_job_result(
        self,
        job_id: str,
        skip: Optional[int] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """Get paginated job results"""
        params = {}
        if skip is not None:
            params['skip'] = skip
        if limit is not None:
            params['limit'] = limit
        return self._request('GET', f'/qapi/v1/jobs/{job_id}/paginatedResult', params=params)
    
    def get_job_result(self, job_id: str) -> Dict:
        """Get job result"""
        return self._request('GET', f'/qapi/v1/jobs/{job_id}/result')
    
    def enqueue_job(self, job_id: str) -> Dict:
        """Enqueue a job"""
        return self._request('POST', '/qapi/v1/jobs/queue', params={'id': job_id})

    # ==================== LEGAL ENTITIES ====================
    
    def get_legal_entities(
        self,
        search: Optional[str] = None,
        virtual_entity_ids: Optional[List[str]] = None,
        properties: Optional[List[str]] = None,
        include_virtual_entities: Optional[bool] = None,
        skip: Optional[int] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """
        Get legal entities matching search criteria.
        
        Args:
            search: A search string e.g. for the legal entity name
            virtual_entity_ids: Filter for entities that own specified virtual entity IDs
            properties: Filter by properties (format: '{"propertyName": "propertyValue"}')
            include_virtual_entities: Also include virtual entities in results
            skip: Number of results to skip
            limit: Number of results to return
        """
        params = {}
        if search:
            params['Search'] = search
        if virtual_entity_ids:
            params['VirtualEntityIds'] = virtual_entity_ids
        if properties:
            params['Properties'] = properties
        if include_virtual_entities is not None:
            params['IncludeVirtualEntities'] = include_virtual_entities
        if skip is not None:
            params['Skip'] = skip
        if limit is not None:
            params['Limit'] = limit
        return self._request('GET', '/qapi/v1/legalEntities', params=params)
    
    def create_legal_entity(
        self,
        entity_data: Dict,
        template_id: Optional[str] = None,
        copy_accounting: bool = False,
        copy_working_users: bool = False,
        copy_common_properties: bool = False
    ) -> Dict:
        """
        Create a new legal entity.
        
        Args:
            entity_data: Data of the legal entity to create
            template_id: Optional template legal entity to copy settings from
            copy_accounting: Copy accounting information from template
            copy_working_users: Copy working users from template
            copy_common_properties: Copy common properties from template
        """
        params = {}
        if template_id:
            params['templateId'] = template_id
        if copy_accounting:
            params['copyAccounting'] = copy_accounting
        if copy_working_users:
            params['copyWorkingUsers'] = copy_working_users
        if copy_common_properties:
            params['copyCommonProperties'] = copy_common_properties
        return self._request('POST', '/qapi/v1/legalEntities', params=params, data=entity_data)
    
    def delete_legal_entities(self, entity_ids: List[str]) -> Dict:
        """Delete multiple legal entities at once"""
        return self._request('DELETE', '/qapi/v1/legalEntities', data=entity_ids)
    
    def get_legal_entity(
        self,
        entity_id: str,
        include_inherited_properties: bool = False
    ) -> Dict:
        """Get legal entity details"""
        params = {}
        if include_inherited_properties:
            params['includeInheritedProperties'] = include_inherited_properties
        return self._request('GET', f'/qapi/v1/legalEntities/{entity_id}', params=params)
    
    def update_legal_entity(self, entity_id: str, entity_data: Dict) -> Dict:
        """Update legal entity details"""
        return self._request('PUT', f'/qapi/v1/legalEntities/{entity_id}', data=entity_data)
    
    def delete_legal_entity(self, entity_id: str) -> Dict:
        """Delete a legal entity"""
        return self._request('DELETE', f'/qapi/v1/legalEntities/{entity_id}')
    
    def get_legal_entity_benchmarks(self, entity_id: str) -> Dict:
        """Get legal entity benchmarks"""
        return self._request('GET', f'/qapi/v1/legalEntities/{entity_id}/benchmarks')
    
    def add_legal_entity_benchmark(self, entity_id: str, benchmark_data: Dict) -> Dict:
        """Add benchmark to legal entity"""
        return self._request('POST', f'/qapi/v1/legalEntities/{entity_id}/benchmarks', data=benchmark_data)
    
    def remove_legal_entity_benchmark(self, entity_id: str, benchmark_id: str) -> Dict:
        """Remove benchmark from legal entity"""
        return self._request('DELETE', f'/qapi/v1/legalEntities/{entity_id}/benchmarks/{benchmark_id}')
    
    # Custodians
    def get_custodians(
        self,
        entity_id: str,
        external_id: Optional[str] = None,
        skip: Optional[int] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """Get custodians for a legal entity"""
        params = {}
        if external_id:
            params['ExternalId'] = external_id
        if skip is not None:
            params['Skip'] = skip
        if limit is not None:
            params['Limit'] = limit
        return self._request('GET', f'/qapi/v1/legalEntities/{entity_id}/custodians', params=params)
    
    def create_custodian(self, entity_id: str, custodian_data: Dict) -> Dict:
        """Create a custodian for legal entity"""
        return self._request('POST', f'/qapi/v1/legalEntities/{entity_id}/custodians', data=custodian_data)
    
    def get_custodian(self, entity_id: str, custodian_id: str) -> Dict:
        """Get a specific custodian"""
        return self._request('GET', f'/qapi/v1/legalEntities/{entity_id}/custodian/{custodian_id}')
    
    def update_custodian(self, entity_id: str, custodian_id: str, custodian_data: Dict) -> Dict:
        """Update a custodian"""
        return self._request('PUT', f'/qapi/v1/legalEntities/{entity_id}/custodian/{custodian_id}', data=custodian_data)
    
    def delete_custodian(self, entity_id: str, custodian_id: str) -> Dict:
        """Delete a custodian"""
        return self._request('DELETE', f'/qapi/v1/legalEntities/{entity_id}/custodian/{custodian_id}')
    
    def get_custodian_benchmarks(self, entity_id: str, custodian_id: str) -> Dict:
        """Get custodian benchmarks"""
        return self._request('GET', f'/qapi/v1/legalEntities/{entity_id}/custodian/{custodian_id}/benchmarks')
    
    def add_custodian_benchmark(self, entity_id: str, custodian_id: str, benchmark_data: Dict) -> Dict:
        """Add benchmark to custodian"""
        return self._request('POST', f'/qapi/v1/legalEntities/{entity_id}/custodian/{custodian_id}/benchmarks', data=benchmark_data)
    
    def remove_custodian_benchmark(self, entity_id: str, custodian_id: str, benchmark_id: str) -> Dict:
        """Remove benchmark from custodian"""
        return self._request('DELETE', f'/qapi/v1/legalEntities/{entity_id}/custodian/{custodian_id}/benchmarks/{benchmark_id}')
    
    def create_custodian_bank_accounts(self, entity_id: str, bank_accounts_data: List[Dict]) -> Dict:
        """Create settlement bank accounts for custodian"""
        return self._request('POST', f'/qapi/v1/legalEntities/{entity_id}/bankAccounts', data=bank_accounts_data)
    
    def get_custodian_bank_accounts(self, entity_id: str, custodian_id: str) -> Dict:
        """Get bank accounts for custodian"""
        return self._request('GET', f'/qapi/v1/legalEntities/{entity_id}/custodians/{custodian_id}/bankAccounts')
    
    # Properties
    def get_legal_entity_properties(self, entity_id: str) -> Dict:
        """Get all property histories for legal entity"""
        return self._request('GET', f'/qapi/v1/legalEntities/{entity_id}/properties')
    
    def update_legal_entity_properties(self, entity_id: str, properties_data: List[Dict]) -> Dict:
        """Update multiple properties on legal entity"""
        return self._request('PUT', f'/qapi/v1/legalEntities/{entity_id}/properties', data=properties_data)
    
    def get_legal_entity_property(self, entity_id: str, property_id: str) -> Dict:
        """Get property history for a legal entity"""
        return self._request('GET', f'/qapi/v1/legalEntities/{entity_id}/properties/{property_id}')
    
    def create_legal_entity_property(self, entity_id: str, property_id: str, property_data: Dict) -> Dict:
        """Create property history for a legal entity"""
        return self._request('POST', f'/qapi/v1/legalEntities/{entity_id}/properties/{property_id}', data=property_data)
    
    def update_legal_entity_property(self, entity_id: str, property_id: str, property_data: Dict) -> Dict:
        """Update property history for a legal entity"""
        return self._request('PUT', f'/qapi/v1/legalEntities/{entity_id}/properties/{property_id}', data=property_data)
    
    def delete_legal_entity_property(self, entity_id: str, property_id: str) -> Dict:
        """Delete property history for a legal entity"""
        return self._request('DELETE', f'/qapi/v1/legalEntities/{entity_id}/properties/{property_id}')
    
    # Query Results
    def get_legal_entity_query_results(
        self,
        entity_id: str,
        preset_id: str,
        group_id: Optional[str] = None,
        respect_hide: Optional[bool] = None,
        interval: Optional[str] = None,
        start_date: Optional[str] = None,
        analytic_start_provider_id: Optional[str] = None,
        entry_type: Optional[str] = None,
        due_date: Optional[str] = None
    ) -> Dict:
        """Get legal entity query results for predefined preset"""
        params = {}
        if group_id:
            params['GroupId'] = group_id
        if respect_hide is not None:
            params['RespectHide'] = respect_hide
        if interval:
            params['Interval'] = interval
        if start_date:
            params['StartDate'] = start_date
        if analytic_start_provider_id:
            params['AnalyticStartProviderId'] = analytic_start_provider_id
        if entry_type:
            params['EntryType'] = entry_type
        if due_date:
            params['DueDate'] = due_date
        return self._request('GET', f'/qapi/v1/legalEntities/{entity_id}/queryResults/{preset_id}', params=params)
    
    def get_legal_entity_transaction_query_results(
        self,
        entity_id: str,
        preset_id: str,
        client_group_id: Optional[str] = None,
        from_date: Optional[str] = None,
        entry_type: Optional[str] = None,
        due_date: Optional[str] = None
    ) -> Dict:
        """Get transaction query results for legal entity"""
        params = {}
        if client_group_id:
            params['ClientGroupId'] = client_group_id
        if from_date:
            params['From'] = from_date
        if entry_type:
            params['EntryType'] = entry_type
        if due_date:
            params['DueDate'] = due_date
        return self._request('GET', f'/qapi/v1/legalEntities/{entity_id}/transactionQueryResults/{preset_id}', params=params)
    
    # Working Users
    def get_legal_entity_working_users(
        self,
        entity_id: str,
        skip: Optional[int] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """Get users with access rights for the legal entity"""
        params = {}
        if skip is not None:
            params['Skip'] = skip
        if limit is not None:
            params['Limit'] = limit
        return self._request('GET', f'/qapi/v1/legalEntities/{entity_id}/workingUsers', params=params)
    
    # Analytics Start Provider
    def get_analytics_start_providers(
        self,
        skip: Optional[int] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """Get analytics start providers"""
        params = {}
        if skip is not None:
            params['Skip'] = skip
        if limit is not None:
            params['Limit'] = limit
        return self._request('GET', '/qapi/v1/legalEntities/analyticsStartProvider', params=params)
    
    def get_analytics_start_provider_date(
        self,
        entity_id: str,
        analytics_start_id: Optional[str] = None,
        due_date: Optional[str] = None
    ) -> Dict:
        """Get resolved date for analytics start provider for given legal entity"""
        params = {}
        if analytics_start_id:
            params['analyticsStartId'] = analytics_start_id
        if due_date:
            params['dueDate'] = due_date
        return self._request('GET', f'/qapi/v1/legalEntities/{entity_id}/analyticsStart', params=params)
    
    # Documents
    def get_legal_entity_document_links(
        self,
        entity_id: str,
        skip: Optional[int] = None,
        limit: Optional[int] = None,
        search: Optional[str] = None,
        categories: Optional[List[str]] = None,
        sort_by: Optional[str] = None
    ) -> Dict:
        """Get legal entity document links"""
        params = {}
        if skip is not None:
            params['Skip'] = skip
        if limit is not None:
            params['Limit'] = limit
        if search:
            params['search'] = search
        if categories:
            params['categories'] = categories
        if sort_by:
            params['sortBy'] = sort_by
        return self._request('GET', f'/qapi/v1/legalEntities/{entity_id}/documentLinks', params=params)
    
    def set_legal_entity_document_link(
        self,
        entity_id: str,
        document_id: Optional[str] = None,
        path: Optional[str] = None
    ) -> Dict:
        """Set document link for legal entity"""
        params = {}
        if document_id:
            params['DocumentId'] = document_id
        if path:
            params['Path'] = path
        return self._request('POST', f'/qapi/v1/legalEntities/{entity_id}/documentLinks', params=params)
    
    def get_legal_entity_document_tree(
        self,
        entity_id: str,
        skip: Optional[int] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """Get legal entity document tree"""
        params = {}
        if skip is not None:
            params['Skip'] = skip
        if limit is not None:
            params['Limit'] = limit
        return self._request('GET', f'/qapi/v1/legalEntities/{entity_id}/documentTree', params=params)
    
    def get_legal_entity_document_subtree(
        self,
        entity_id: str,
        path: str,
        skip: Optional[int] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """Get legal entity document subtree"""
        params = {}
        if skip is not None:
            params['Skip'] = skip
        if limit is not None:
            params['Limit'] = limit
        return self._request('GET', f'/qapi/v1/legalEntities/{entity_id}/documentTree/{path}', params=params)
    
    # Virtual Entities
    def get_virtual_entities(
        self,
        entity_id: str,
        skip: Optional[int] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """Get virtual entities for a legal entity"""
        params = {}
        if skip is not None:
            params['Skip'] = skip
        if limit is not None:
            params['Limit'] = limit
        return self._request('GET', f'/qapi/v1/legalEntities/{entity_id}/virtualEntities', params=params)

    def update_virtual_entity(self, entity_id: str, virtual_id: str, virtual_entity_data: Dict) -> Dict:
        """Update virtual entity"""
        return self._request('PUT', f'/qapi/v1/legalEntities/{entity_id}/virtualEntities/{virtual_id}', data=virtual_entity_data)

    def delete_virtual_entity(self, entity_id: str, virtual_id: str) -> Dict:
        """Delete virtual entity"""
        return self._request('DELETE', f'/qapi/v1/legalEntities/{entity_id}/virtualEntities/{virtual_id}')

    def get_virtual_entity_benchmarks(self, entity_id: str, virtual_id: str) -> Dict:
        """Get virtual entity benchmarks"""
        return self._request('GET', f'/qapi/v1/legalEntities/{entity_id}/virtualEntities/{virtual_id}/benchmarks')

    def add_virtual_entity_benchmark(self, entity_id: str, virtual_id: str, benchmark_data: Dict) -> Dict:
        """Add benchmark to virtual entity"""
        return self._request('POST', f'/qapi/v1/legalEntities/{entity_id}/virtualEntities/{virtual_id}/benchmarks', data=benchmark_data)

    def remove_virtual_entity_benchmark(self, entity_id: str, virtual_id: str, benchmark_id: str) -> Dict:
        """Remove benchmark from virtual entity"""
        return self._request('DELETE', f'/qapi/v1/legalEntities/{entity_id}/virtualEntities/{virtual_id}/benchmarks/{benchmark_id}')

    # Virtual Entity Custodians
    def get_virtual_entity_custodians(
        self,
        entity_id: str,
        virtual_id: str,
        external_id: Optional[str] = None,
        skip: Optional[int] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """Get custodians for virtual entity"""
        params = {}
        if external_id:
            params['ExternalId'] = external_id
        if skip is not None:
            params['Skip'] = skip
        if limit is not None:
            params['Limit'] = limit
        return self._request('GET', f'/qapi/v1/legalEntities/{entity_id}/virtualEntities/{virtual_id}/custodians', params=params)
    
    def create_virtual_entity_custodian(self, entity_id: str, virtual_id: str, custodian_data: Dict) -> Dict:
        """Create custodian for virtual entity"""
        return self._request('POST', f'/qapi/v1/legalEntities/{entity_id}/virtualEntities/{virtual_id}/custodians', data=custodian_data)
    
    def delete_virtual_entity_custodian(self, entity_id: str, virtual_id: str, custodian_id: str) -> Dict:
        """Delete custodian from virtual entity"""
        return self._request('DELETE', f'/qapi/v1/legalEntities/{entity_id}/virtualEntities/{virtual_id}/custodians/{custodian_id}')
    
    # Virtual Entity Custodian Benchmarks
    def get_virtual_entity_custodian_benchmarks(self, entity_id: str, virtual_id: str, custodian_id: str) -> Dict:
        """Get virtual entity custodian benchmarks"""
        return self._request('GET', f'/qapi/v1/legalEntities/{entity_id}/virtualEntities/{virtual_id}/custodian/{custodian_id}/benchmarks')
    
    def add_virtual_entity_custodian_benchmark(self, entity_id: str, virtual_id: str, custodian_id: str, benchmark_data: Dict) -> Dict:
        """Add benchmark to virtual entity custodian"""
        return self._request('POST', f'/qapi/v1/legalEntities/{entity_id}/virtualEntities/{virtual_id}/custodian/{custodian_id}/benchmarks', data=benchmark_data)
    
    def remove_virtual_entity_custodian_benchmark(self, entity_id: str, virtual_id: str, custodian_id: str, benchmark_id: str) -> Dict:
        """Remove benchmark from virtual entity custodian"""
        return self._request('DELETE', f'/qapi/v1/legalEntities/{entity_id}/virtualEntities/{virtual_id}/custodian/{custodian_id}/benchmarks/{benchmark_id}')
    
    # Virtual Entity Properties
    def get_virtual_entity_properties(self, entity_id: str, virtual_id: str) -> Dict:
        """Get property histories for virtual entity"""
        return self._request('GET', f'/qapi/v1/legalEntities/{entity_id}/virtualEntities/{virtual_id}/properties')
    
    def update_virtual_entity_properties(self, entity_id: str, virtual_id: str, properties_data: List[Dict]) -> Dict:
        """Update multiple properties on virtual entity"""
        return self._request('PUT', f'/qapi/v1/legalEntities/{entity_id}/virtualEntities/{virtual_id}/properties', data=properties_data)
    
    def get_virtual_entity_property(self, entity_id: str, virtual_id: str, property_id: str) -> Dict:
        """Get virtual entity property history"""
        return self._request('GET', f'/qapi/v1/legalEntities/{entity_id}/virtualEntities/{virtual_id}/properties/{property_id}')
    
    def create_virtual_entity_property(self, entity_id: str, virtual_id: str, property_id: str, property_data: Dict) -> Dict:
        """Create virtual entity property history"""
        return self._request('POST', f'/qapi/v1/legalEntities/{entity_id}/virtualEntities/{virtual_id}/properties/{property_id}', data=property_data)
    
    def update_virtual_entity_property(self, entity_id: str, virtual_id: str, property_id: str, property_data: Dict) -> Dict:
        """Update virtual entity property history"""
        return self._request('PUT', f'/qapi/v1/legalEntities/{entity_id}/virtualEntities/{virtual_id}/properties/{property_id}', data=property_data)
    
    def delete_virtual_entity_property(self, entity_id: str, virtual_id: str, property_id: str) -> Dict:
        """Delete virtual entity property history"""
        return self._request('DELETE', f'/qapi/v1/legalEntities/{entity_id}/virtualEntities/{virtual_id}/properties/{property_id}')
    
    # Virtual Entity Documents
    def get_virtual_entity_document_links(
        self,
        entity_id: str,
        virtual_id: str,
        skip: Optional[int] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """Get virtual entity document links"""
        params = {}
        if skip is not None:
            params['Skip'] = skip
        if limit is not None:
            params['Limit'] = limit
        return self._request('GET', f'/qapi/v1/legalEntities/{entity_id}/virtualEntities/{virtual_id}/documentLinks', params=params)
    
    def set_virtual_entity_document_link(
        self,
        entity_id: str,
        virtual_id: str,
        document_id: Optional[str] = None,
        path: Optional[str] = None
    ) -> Dict:
        """Set virtual entity document link"""
        params = {}
        if document_id:
            params['DocumentId'] = document_id
        if path:
            params['Path'] = path
        return self._request('POST', f'/qapi/v1/legalEntities/{entity_id}/virtualEntities/{virtual_id}/documentLinks', params=params)
    
    def get_virtual_entity_document_tree(
        self,
        entity_id: str,
        virtual_id: str,
        skip: Optional[int] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """Get virtual entity document tree"""
        params = {}
        if skip is not None:
            params['Skip'] = skip
        if limit is not None:
            params['Limit'] = limit
        return self._request('GET', f'/qapi/v1/legalEntities/{entity_id}/virtualEntities/{virtual_id}/documentTree', params=params)
    
    def get_virtual_entity_document_subtree(
        self,
        entity_id: str,
        virtual_id: str,
        path: str,
        skip: Optional[int] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """Get virtual entity document subtree"""
        params = {}
        if skip is not None:
            params['Skip'] = skip
        if limit is not None:
            params['Limit'] = limit
        return self._request('GET', f'/qapi/v1/legalEntities/{entity_id}/virtualEntities/{virtual_id}/documentTree/{path}', params=params)
    
    # Filter
    def create_filter(self, entity_id: str, filter_data: Dict) -> str:
        """Create filter for perspective IDs"""
        return self._request('POST', f'/qapi/v1/legalEntities/{entity_id}/filterId', data=filter_data)

    # ==================== PRESETS ====================
    
    def get_presets(
        self,
        skip: Optional[int] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """Get presets"""
        params = {}
        if skip is not None:
            params['Skip'] = skip
        if limit is not None:
            params['Limit'] = limit
        return self._request('GET', '/qapi/v1/presets', params=params)
    
    def get_preset(self, preset_id: str) -> Dict:
        """Get preset details"""
        return self._request('GET', f'/qapi/v1/presets/{preset_id}')

    # ==================== SECURITIES ====================
    
    def get_securities(
        self,
        skip: Optional[int] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """Get securities matching search criteria"""
        params = {}
        if skip is not None:
            params['Skip'] = skip
        if limit is not None:
            params['Limit'] = limit
        return self._request('GET', '/qapi/v1/securities', params=params)
    
    def get_security(self, security_id: str) -> Dict:
        """Get security details"""
        return self._request('GET', f'/qapi/v1/securities/{security_id}')
    
    def get_security_benchmarks(self, security_id: str) -> Dict:
        """Get security benchmarks"""
        return self._request('GET', f'/qapi/v1/securities/{security_id}/benchmarks')
    
    def add_security_benchmark(self, security_id: str, benchmark_data: Dict) -> Dict:
        """Add benchmark to security"""
        return self._request('POST', f'/qapi/v1/securities/{security_id}/benchmarks', data=benchmark_data)
    
    def remove_security_benchmark(self, security_id: str, benchmark_id: str) -> Dict:
        """Remove benchmark from security"""
        return self._request('DELETE', f'/qapi/v1/securities/{security_id}/benchmarks/{benchmark_id}')
    
    def get_security_investments(self, security_id: str) -> Dict:
        """Get security investments"""
        return self._request('GET', f'/qapi/v1/securities/{security_id}/investments')
    
    def get_security_images(self, security_id: str) -> Dict:
        """Get security images"""
        return self._request('GET', f'/qapi/v1/securities/{security_id}/images')
    
    def upload_security_image(self, security_id: str, image_data: Dict) -> Dict:
        """Upload security image"""
        return self._request('POST', f'/qapi/v1/securities/{security_id}/images', data=image_data)
    
    def get_security_image(self, security_id: str, image_id: str) -> Dict:
        """Get specific security image"""
        return self._request('GET', f'/qapi/v1/securities/{security_id}/images/{image_id}')
    
    def get_security_logo(self, security_id: str) -> Dict:
        """Get security logo"""
        return self._request('GET', f'/qapi/v1/securities/{security_id}/logo')
    
    def get_security_document_links(
        self,
        security_id: str,
        skip: Optional[int] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """Get security document links"""
        params = {}
        if skip is not None:
            params['Skip'] = skip
        if limit is not None:
            params['Limit'] = limit
        return self._request('GET', f'/qapi/v1/securities/{security_id}/documentLinks', params=params)
    
    def set_security_document_link(
        self,
        security_id: str,
        document_id: Optional[str] = None,
        path: Optional[str] = None
    ) -> Dict:
        """Set document link for security"""
        params = {}
        if document_id:
            params['DocumentId'] = document_id
        if path:
            params['Path'] = path
        return self._request('POST', f'/qapi/v1/securities/{security_id}/documentLinks', params=params)
    
    def get_security_document_tree(
        self,
        security_id: str,
        skip: Optional[int] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """Get security document tree"""
        params = {}
        if skip is not None:
            params['Skip'] = skip
        if limit is not None:
            params['Limit'] = limit
        return self._request('GET', f'/qapi/v1/securities/{security_id}/documentTree', params=params)
    
    def get_security_document_subtree(
        self,
        security_id: str,
        path: str,
        skip: Optional[int] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """Get security document subtree"""
        params = {}
        if skip is not None:
            params['Skip'] = skip
        if limit is not None:
            params['Limit'] = limit
        return self._request('GET', f'/qapi/v1/securities/{security_id}/documentTree/{path}', params=params)
    
    def upload_security_document(self, security_id: str, document_data: Dict) -> Dict:
        """Upload security document"""
        return self._request('POST', f'/qapi/v1/securities/{security_id}/documents', data=document_data)
    
    def get_security_query_results(
        self,
        security_id: str,
        preset_id: str,
        interval: Optional[str] = None,
        start_date: Optional[str] = None,
        analytic_start_provider_id: Optional[str] = None,
        entry_type: Optional[str] = None,
        due_date: Optional[str] = None
    ) -> Dict:
        """Get security query results for predefined preset"""
        params = {}
        if interval:
            params['Interval'] = interval
        if start_date:
            params['StartDate'] = start_date
        if analytic_start_provider_id:
            params['AnalyticStartProviderId'] = analytic_start_provider_id
        if entry_type:
            params['EntryType'] = entry_type
        if due_date:
            params['DueDate'] = due_date
        return self._request('GET', f'/qapi/v1/securities/{security_id}/queryResults/{preset_id}', params=params)
    
    def get_security_properties(self, security_id: str) -> Dict:
        """Get security properties"""
        return self._request('GET', f'/qapi/v1/securities/{security_id}/properties')
    
    def update_security_properties(self, security_id: str, properties_data: List[Dict]) -> Dict:
        """Update security properties"""
        return self._request('PUT', f'/qapi/v1/securities/{security_id}/properties', data=properties_data)
    
    def get_security_property(self, security_id: str, property_id: str) -> Dict:
        """Get specific security property"""
        return self._request('GET', f'/qapi/v1/securities/{security_id}/properties/{property_id}')
    
    def create_security_property(self, security_id: str, property_id: str, property_data: Dict) -> Dict:
        """Create security property"""
        return self._request('POST', f'/qapi/v1/securities/{security_id}/properties/{property_id}', data=property_data)
    
    def update_security_property(self, security_id: str, property_id: str, property_data: Dict) -> Dict:
        """Update security property"""
        return self._request('PUT', f'/qapi/v1/securities/{security_id}/properties/{property_id}', data=property_data)
    
    def delete_security_property(self, security_id: str, property_id: str) -> Dict:
        """Delete security property"""
        return self._request('DELETE', f'/qapi/v1/securities/{security_id}/properties/{property_id}')

    # ==================== USERS ====================
    
    def get_users(
        self,
        skip: Optional[int] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """Get users"""
        params = {}
        if skip is not None:
            params['Skip'] = skip
        if limit is not None:
            params['Limit'] = limit
        return self._request('GET', '/qapi/v1/users', params=params)
    
    def create_user(self, user_data: Dict) -> Dict:
        """Create a new user"""
        return self._request('POST', '/qapi/v1/users', data=user_data)
    
    def get_user(self, user_id: str) -> Dict:
        """Get user details"""
        return self._request('GET', f'/qapi/v1/users/{user_id}')
    
    def update_user(self, user_id: str, user_data: Dict) -> Dict:
        """Update user"""
        return self._request('POST', f'/qapi/v1/users/{user_id}', data=user_data)
    
    def activate_user(self, user_id: str) -> Dict:
        """Activate user"""
        return self._request('POST', f'/qapi/v1/users/{user_id}/activate')
    
    def deactivate_user(self, user_id: str) -> Dict:
        """Deactivate user"""
        return self._request('POST', f'/qapi/v1/users/{user_id}/deactivate')
    
    def get_role_group_names(self) -> Dict:
        """Get role group names"""
        return self._request('GET', '/qapi/v1/users/roleGroups')
    
    def set_user_role_groups(self, user_id: str, role_groups_data: Dict) -> Dict:
        """Set user role groups"""
        return self._request('POST', f'/qapi/v1/users/{user_id}/roleGroups', data=role_groups_data)
    
    def set_user_roles(self, user_id: str, roles_data: Dict) -> Dict:
        """Set user roles"""
        return self._request('POST', f'/qapi/v1/users/{user_id}/roles', data=roles_data)
    
    def heartbeat(self) -> Dict:
        """User heartbeat"""
        return self._request('GET', '/qapi/v1/users/me/heartbeat')
    
    def post_activity(self, activity_data: Dict) -> Dict:
        """Post user activity"""
        return self._request('POST', '/qapi/v1/users/me/activity', data=activity_data)
    
    def forgot_password(self, data: Dict) -> Dict:
        """Request forgot password"""
        return self._request('POST', '/qapi/v1/users/forgotpassword', data=data)
    
    def set_forgot_password(self, data: Dict) -> Dict:
        """Set new password after forgot password request"""
        return self._request('POST', '/qapi/v1/users/forgotpassword/set', data=data)

