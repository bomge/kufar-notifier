import type React from 'react';
import { useState } from 'react';
import { Modal, TextInput, NumberInput, Button, Group, Stack, Text, Box, Accordion } from '@mantine/core';
import type { IConfig } from '../api/api';

interface DefaultConfigModalProps {
	isOpen: boolean;
	onClose: () => void;
	defaultConfig: Pick<IConfig, 'queues' | 'telegram' | 'defaultCheckInterval' | 'defaultImgCount'>;
	onSave: (newConfig: Pick<IConfig, 'queues' | 'telegram' | 'defaultCheckInterval' | 'defaultImgCount'>) => void;
}

const DefaultConfigModal: React.FC<DefaultConfigModalProps> = ({ isOpen, onClose, defaultConfig, onSave }) => {
	const [tempConfig, setTempConfig] = useState<Pick<IConfig, 'queues' | 'telegram' | 'defaultCheckInterval' | 'defaultImgCount'>>(defaultConfig);

	const handleSave = () => {
		onSave(tempConfig);
		onClose();
	};

	const updateConfig = (path: string[], value: any) => {
		setTempConfig(prevConfig => {
			const newConfig = { ...prevConfig };
			let current: any = newConfig;
			for (let i = 0; i < path.length - 1; i++) {
				current[path[i]] = { ...current[path[i]] };
				current = current[path[i]];
			}
			current[path[path.length - 1]] = value;
			return newConfig;
		});
	};

	return (
		<Modal opened={isOpen} onClose={onClose} title="Default Configuration Settings" size="lg">
		  <Stack>
			<Accordion defaultValue={["telegram"]} multiple
			styles={(theme) => ({
				control: {
					backgroundColor: theme.colors.gray[2],
					border: `1px solid ${theme.colors.gray[3]}`,
				},
				content: {
					backgroundColor: 'rgb(241 243 245 / 59%)',
				},
			})}
			>
				<Accordion.Item value="telegram">
				<Accordion.Control>
				  <Text fw={700}>Telegram Settings</Text>
				</Accordion.Control>
				<Accordion.Panel>
				  <TextInput
					label="Default Chat ID"
					value={tempConfig.telegram.defaultChatId}
					onChange={(e) => updateConfig(['telegram', 'defaultChatId'], e.target.value)}
				  />
				  <TextInput
					label="Error Chat ID"
					value={tempConfig.telegram.errorChatId}
					onChange={(e) => updateConfig(['telegram', 'errorChatId'], e.target.value)}
				  />
				  <TextInput
					label="Bot Token"
					value={tempConfig.telegram.botToken}
					onChange={(e) => updateConfig(['telegram', 'botToken'], e.target.value)}
				  />
				</Accordion.Panel>
			  </Accordion.Item>
			  <Accordion.Item value="general">
				<Accordion.Control>
				  <Text fw={700}>General Settings</Text>
				</Accordion.Control>
				<Accordion.Panel>
				  <TextInput
					label="Default Check Interval"
					value={tempConfig.defaultCheckInterval}
					onChange={(e) => updateConfig(['defaultCheckInterval'], e.target.value)}
				  />
				  <NumberInput
					label="Default Image Count"
					value={tempConfig.defaultImgCount}
					onChange={(value) => updateConfig(['defaultImgCount'], value)}
				  />
				</Accordion.Panel>
			  </Accordion.Item>
	  
			  
	  
			  <Accordion.Item value="queues">
				<Accordion.Control>
				  <Text fw={700}>Queue Settings</Text>
				</Accordion.Control>
				<Accordion.Panel>
				  {Object.entries(tempConfig.queues).map(([queueName, queueConfig]) => (
					<Box key={queueName} mt="sm">
					  <Text fw={500}>{queueName}</Text>
					  <NumberInput
						label="Concurrency"
						value={queueConfig.concurrency}
						onChange={(value) => updateConfig(['queues', queueName, 'concurrency'], value)}
					  />
					  <NumberInput
						label="Interval"
						value={queueConfig.interval}
						onChange={(value) => updateConfig(['queues', queueName, 'interval'], value)}
					  />
					  <NumberInput
						label="Max Per Interval"
						value={queueConfig.maxPerInterval}
						onChange={(value) => updateConfig(['queues', queueName, 'maxPerInterval'], value)}
					  />
					</Box>
				  ))}
				</Accordion.Panel>
			  </Accordion.Item>
			</Accordion>
	  
			<Group  mt="md">
			  <Button onClick={onClose} color='red.4'>Cancel</Button>
			  <Button onClick={handleSave} color="green.5">Apply</Button>
			</Group>
		  </Stack>
		</Modal>
	  );
};

export default DefaultConfigModal;
