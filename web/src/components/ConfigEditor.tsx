import type React from 'react';
import { useState, useEffect } from 'react';
import { Select, Accordion, TextInput, Switch, Group, Button, Box, Text, NumberInput, LoadingOverlay, Notification, Stack, ActionIcon } from '@mantine/core';
import { fetchConfig, updateConfig, type IConfig } from '../api/api';
import { notifications } from '@mantine/notifications';
import { IconSettings } from '@tabler/icons-react';
import DefaultConfigModal from './DefaultConfigModal';

const ConfigEditor: React.FC = () => {
	const [config, setConfig] = useState<IConfig | null>(null);
	const [isDefaultConfigModalOpen, setIsDefaultConfigModalOpen] = useState(false);
	const [selectedSite, setSelectedSite] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [tempConfig, setTempConfig] = useState<IConfig | null>(null);
	// const [expandedItems, setExpandedItems] = useState<string | null>(null);
	const [expandedItems, setExpandedItems] = useState<string[]>([]);

	useEffect(() => {
		const loadConfig = async () => {
			try {
				setLoading(true);
				const data = await fetchConfig();
				setConfig(data);
				setTempConfig(JSON.parse(JSON.stringify(data))); // Deep copy

				// Automatically select the first site
				const firstSite = Object.keys(data.sites)[0];
				setSelectedSite(firstSite);

				setError(null);
			} catch (err) {
				notifications.show({
					title: 'Error',
					message: 'Failed to fetch config. Please check if the server is running and the API URL is correct.',
					color: 'red',
				});
			} finally {
				setLoading(false);
			}
		};
		loadConfig();
	}, []);

	const handleSave = async () => {
		if (!tempConfig) return;
		try {
			setLoading(true);
			await updateConfig(tempConfig);
			setConfig(tempConfig);
			notifications.show({
				title: 'Success',
				message: 'Config updated successfully',
				color: 'green',
			});
		} catch (err) {
			//@ts-ignore
			notifications.show({
				title: 'Error',
				message: `Failed to update config. Please try again.\n${(err as any)?.errors || ''}`,
				color: 'red',
			});
		} finally {
			setLoading(false);
			setIsDefaultConfigModalOpen(false);
		}
	};
	const handleSaveDefaultConfig = (newDefaultConfig: Pick<IConfig, 'queues' | 'telegram' | 'defaultCheckInterval' | 'defaultImgCount'>) => {
		setTempConfig(prev => {
			if (!prev) return prev; //handle the case where prev might be null
			return {
				...prev,
				...newDefaultConfig
			};
		});
		setIsDefaultConfigModalOpen(false);
	};
	const handleAddUrl = () => {
		if (!selectedSite || !tempConfig) return;
		const newUrl = {
			url: '',
			enabled: true,
			prefix: 'New URL',
			type: 'other' as const,
			checkInterval: '5-10',
			id: String(new Date())
		};
		setTempConfig(prev => {
			if (!prev) return prev;
			return {
				...prev,
				sites: {
					...prev.sites,
					[selectedSite]: {
						...prev.sites[selectedSite],
						urls: [...prev.sites[selectedSite].urls, newUrl],
					},
				},
			};
		});
		setExpandedItems(prev => [...prev, newUrl.id]);
		// setExpandedItems(prev => newUrl.id);
	};

	const handleDeleteUrl = (index: number) => {
		if (!selectedSite || !tempConfig) return;
		setTempConfig(prev => {
			if (!prev) return prev;
			const newUrls = [...prev.sites[selectedSite].urls];
			newUrls.splice(index, 1);
			return {
				...prev,
				sites: {
					...prev.sites,
					[selectedSite]: {
						...prev.sites[selectedSite],
						urls: newUrls,
					},
				},
			};
		});
	};

	if (loading) return <LoadingOverlay visible={true} />;
	if (error) return <Notification color="red" onClose={() => setError(null)}>{error}</Notification>;
	if (!tempConfig) return <Notification color="blue" onClose={() => { }}>No configuration loaded</Notification>;

	const siteOptions = Object.keys(tempConfig.sites).map(site => ({ value: site, label: site }));
	const urlTypeOptions = [
		{ value: 're', label: 'RE' },
		{ value: 'car', label: 'Car' },
		{ value: 'other', label: 'Other' },
		{ value: 'phone', label: 'Phone' }
	];

	return (
		<Box pos="relative" pb={60}>  {/* Added padding bottom for notification */}
			<LoadingOverlay visible={loading} />
			<Group align="flex-end" mb="md">
				<Select
					label="Select Site"
					placeholder="Choose a site"
					data={siteOptions}
					value={selectedSite}
					onChange={setSelectedSite}
					style={{ flex: 1 }}
				/>
				<ActionIcon
					variant="outline"
					color='gray'
					onClick={() => setIsDefaultConfigModalOpen(true)}
					size="lg"
				>
					<IconSettings size="1.1rem" />
				</ActionIcon>
			</Group>
			{selectedSite && (
				<Stack>
					<Accordion
						multiple
						value={expandedItems}
						onChange={setExpandedItems}
						styles={(theme) => ({
							item: {
								backgroundColor: theme.colors.gray[1],
								border: `1px solid ${theme.colors.gray[3]}`,
							},
							content: {
								backgroundColor: theme.white,
							},
						})}
					>
						{tempConfig.sites[selectedSite].urls.map((url, index) => (
							<Accordion.Item key={url.id} value={url.id}>
								<Accordion.Control>{url.prefix}</Accordion.Control>
								<Accordion.Panel>
									<TextInput
										label="Prefix (Name)"
										value={url.prefix}
										onChange={(event) => {
											const newConfig = { ...tempConfig };
											newConfig.sites[selectedSite].urls[index].prefix = event.currentTarget.value;
											setTempConfig(newConfig);
										}}
										mb="sm"
									/>
									<TextInput
										label="URL"
										value={url.url}
										onChange={(event) => {
											const newConfig = { ...tempConfig };
											newConfig.sites[selectedSite].urls[index].url = event.currentTarget.value;
											setTempConfig(newConfig);
										}}
										mb="sm"
									/>
									<Group grow mb="sm">
										<NumberInput
											label="Interval Min (minutes)"
											value={Number(url.checkInterval?.split('-')[0]) || 0}
											onChange={(value) => {
												const newConfig = { ...tempConfig };
												const max = url.checkInterval?.split('-')[1] || '';
												newConfig.sites[selectedSite].urls[index].checkInterval = `${value}-${max}`;
												setTempConfig(newConfig);
											}}
											min={0}
										/>
										<NumberInput
											label="Interval Max (minutes)"
											value={Number(url.checkInterval?.split('-')[1]) || 0}
											onChange={(value) => {
												const newConfig = { ...tempConfig };
												const min = url.checkInterval?.split('-')[0] || '';
												newConfig.sites[selectedSite].urls[index].checkInterval = `${min}-${value}`;
												setTempConfig(newConfig);
											}}
											min={0}
										/>
									</Group>
									<Group gap='5rem'>

										<Switch
											label="Enabled"
											checked={url.enabled}
											onChange={(event) => {
												const newConfig = { ...tempConfig };
												newConfig.sites[selectedSite].urls[index].enabled = event.currentTarget.checked;
												setTempConfig(newConfig);
											}}
											mb="sm"
										/>
										<Switch
											label="Only With Photo"
											checked={url.onlyWithPhoto || false}
											onChange={(event) => {
												const newConfig = { ...tempConfig };
												newConfig.sites[selectedSite].urls[index].onlyWithPhoto = event.currentTarget.checked;
												setTempConfig(newConfig);
											}}
											mb="sm"
										/>
										<Select
											label="URL Type"
											data={urlTypeOptions}
											value={url.type}
											onChange={(value) => {
												const newConfig = { ...tempConfig };
												newConfig.sites[selectedSite].urls[index].type = value as 're' | 'car' | 'other' | 'phone';
												setTempConfig(newConfig);
											}}
											mb="sm"
										/>
									</Group>
									{/* <NumberInput
										label="Image Count"
										value={url.imgCount || 0}
										onChange={(value) => {
											const newConfig = { ...tempConfig };
											//@ts-ignore
											newConfig.sites[selectedSite].urls[index].imgCount = value;
											setTempConfig(newConfig);
										}}
										min={0}
										mb="sm"
									/> */}

									<TextInput
										label="Telegram Chat ID"
										value={url.tgId || ''}
										onChange={(event) => {
											const newConfig = { ...tempConfig };
											newConfig.sites[selectedSite].urls[index].tgId = event.currentTarget.value;
											setTempConfig(newConfig);
										}}
										mb="sm"
										description="Leave empty to use the default Telegram chat ID"
										styles={(theme) => ({
											input: {
												opacity:
													!url.tgId || url.tgId === tempConfig.telegram.defaultChatId
														? 0.5
														: 1,
											},
											label:{
												opacity:
													!url.tgId || url.tgId === tempConfig.telegram.defaultChatId
														? 0.5
														: 1,
											}
										})}
										placeholder={tempConfig.telegram.defaultChatId}
									/>
									<Button color="red" onClick={() => handleDeleteUrl(index)}>Delete URL</Button>
								</Accordion.Panel>
							</Accordion.Item>
						))}
					</Accordion>
					<Button onClick={handleAddUrl} color='blue.4'>Add New URL</Button>
				</Stack>
			)}
			<Group mt="md">
				<Button onClick={handleSave} color='green.4' disabled={loading}>
					Save Configuration
				</Button>
			</Group>

			<DefaultConfigModal
				isOpen={isDefaultConfigModalOpen}
				onClose={() => setIsDefaultConfigModalOpen(false)}
				defaultConfig={{
					queues: tempConfig.queues,
					telegram: tempConfig.telegram,
					defaultCheckInterval: tempConfig.defaultCheckInterval,
					defaultImgCount: tempConfig.defaultImgCount,
				}}
				onSave={handleSaveDefaultConfig}
			/>
		</Box>
	);
};

export default ConfigEditor;